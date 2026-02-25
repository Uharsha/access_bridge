const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findOne({ "authTokens.token": token }).lean();
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      course: user.course || "",
      token,
    };

    return next();
  } catch (err) {
    return res.status(500).json({ error: "Authentication failed", detail: err.message });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  allowRoles,
};
