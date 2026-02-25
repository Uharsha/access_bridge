const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const env = require("../config/env");
const { createToken, hashPassword, sha256, verifyPassword } = require("../utils/password");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  course: user.course || "",
});

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "TEACHER").trim().toUpperCase();
    const course = String(req.body?.course || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }

    if (!["HEAD", "TEACHER"].includes(role)) {
      return res.status(400).json({ error: "role must be HEAD or TEACHER" });
    }

    if (role === "TEACHER" && !course) {
      return res.status(400).json({ error: "course is required for teacher" });
    }

    const userCount = await User.countDocuments();

    if (userCount > 0) {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      if (!token) {
        return res.status(401).json({ error: "HEAD token required to create account" });
      }

      const creator = await User.findOne({ "authTokens.token": token });
      if (!creator || creator.role !== "HEAD") {
        return res.status(403).json({ error: "Only HEAD can create new accounts" });
      }
    } else if (role !== "HEAD") {
      return res.status(400).json({ error: "First account must be HEAD" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      course: role === "TEACHER" ? course : "",
      authTokens: [],
    });

    return res.status(201).json({ message: "Account created", user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to register", detail: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    let isValid = verifyPassword(password, user.passwordHash);

    // Backward compatibility: legacy users stored bcrypt hash in `password`.
    if (!isValid) {
      const legacy = await User.collection.findOne(
        { _id: user._id },
        { projection: { password: 1 } }
      );

      const legacyHash = String(legacy?.password || "");
      if (legacyHash) {
        const matched = await bcrypt.compare(password, legacyHash).catch(() => false);
        if (matched) {
          isValid = true;
          await User.collection.updateOne(
            { _id: user._id },
            {
              $set: { passwordHash: hashPassword(password) },
              $unset: { password: "" },
            }
          );
        }
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = createToken();
    user.authTokens.push({ token, createdAt: new Date() });
    if (user.authTokens.length > 10) {
      user.authTokens = user.authTokens.slice(-10);
    }
    await user.save();

    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Login failed", detail: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: "If this email exists, reset instructions were sent." });
    }

    const resetToken = createToken();
    user.resetTokenHash = sha256(resetToken);
    user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    const origin = String(req.get("origin") || "").trim();
    const fallbackClient =
      (Array.isArray(env.corsOrigins) && env.corsOrigins.length ? env.corsOrigins[0] : "") ||
      "http://localhost:5550";
    const clientBase = (origin || fallbackClient).replace(/\/+$/, "");
    const resetLink = `${clientBase}/auth?mode=reset&token=${encodeURIComponent(resetToken)}`;

    const mailResult = await sendMail({
      to: user.email,
      subject: "Reset your password - TTI Dashboard",
      text: `Hello ${user.name || ""}, reset your password using this link: ${resetLink}. This link expires in 30 minutes.`,
      html: `
        <p>Hello ${user.name || "User"},</p>
        <p>We received a request to reset your TTI Dashboard password.</p>
        <p><a href="${resetLink}" target="_blank" rel="noopener noreferrer">Reset Password</a></p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    if (!mailResult?.sent) {
      return res.status(500).json({
        error: "Unable to send reset email",
        detail: mailResult?.reason || mailResult?.error || "Unknown mailer error",
      });
    }

    return res.json({
      message: "Reset link sent to your email.",
    });
  } catch (err) {
    return res.status(500).json({ error: "Unable to process forgot password", detail: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return res.status(400).json({ error: "token and password are required" });
    }

    const user = await User.findOne({
      resetTokenHash: sha256(token),
      resetTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    user.passwordHash = hashPassword(password);
    user.resetTokenHash = "";
    user.resetTokenExpiresAt = null;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ error: "Unable to reset password", detail: err.message });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { authTokens: { token: req.user.token } } }
    );
    return res.json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ error: "Logout failed", detail: err.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch profile", detail: err.message });
  }
});

module.exports = router;
