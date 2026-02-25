const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");

const Admission = require("../models/Admission");
const Notification = require("../models/Notification");
const { allowRoles, requireAuth } = require("../middleware/auth");
const { uploadFile } = require("../utils/cloudinary");
const { sendMail, templates } = require("../utils/mailer");
const env = require("../config/env");
let teachersByCourse = {};
try {
  teachersByCourse = require("../utils/teacher");
} catch (_err) {
  teachersByCourse = require("../config/teachers");
}

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 7 * 1024 * 1024,
  },
});

const uploadFields = upload.fields([
  { name: "passport_photo", maxCount: 1 },
  { name: "adhar", maxCount: 1 },
  { name: "UDID", maxCount: 1 },
  { name: "disability", maxCount: 1 },
  { name: "Degree_memo", maxCount: 1 },
  { name: "doctor", maxCount: 1 },
]);

const normalizeText = (value) => String(value || "").trim();

function buildAdmissionForRole(role, course) {
  if (role !== "TEACHER" || !course) return {};
  return { course: normalizeText(course) };
}

function getCourseTeachers(course) {
  const safeCourse = normalizeText(course);
  const raw = teachersByCourse[safeCourse];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((teacher) => ({
      name: normalizeText(teacher?.name),
      email: normalizeText(teacher?.email).toLowerCase(),
    }))
    .filter((teacher) => teacher.email);
}

function visibilityRolesFor(userRole) {
  if (userRole === "HEAD") return ["ALL", "HEAD", "TEACHER"];
  return ["ALL", userRole];
}

function buildNotificationAccessFilter(user, extra = {}) {
  const filter = {
    targetRole: { $in: visibilityRolesFor(user.role) },
    ...extra,
  };

  if (user.role === "TEACHER" && normalizeText(user.course)) {
    filter.$or = [{ targetCourse: "" }, { targetCourse: normalizeText(user.course) }];
  }

  return filter;
}

async function createNotification({
  title,
  message,
  type = "INFO",
  relatedAdmission = null,
  targetRole = "ALL",
  targetCourse = "",
  actor = null,
}) {
  try {
    await Notification.create({
      title: normalizeText(title) || "System Update",
      message: normalizeText(message) || "An update was made.",
      type: normalizeText(type) || "INFO",
      relatedAdmission,
      targetRole,
      targetCourse: normalizeText(targetCourse),
      createdBy: {
        id: actor?._id || null,
        name: normalizeText(actor?.name) || "System",
        role: normalizeText(actor?.role) || "SYSTEM",
      },
    });
  } catch (_err) {
    // Keep admission flow resilient even if notification write fails.
  }
}

async function sendBulkMails(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  return Promise.allSettled(
    items.map((item) =>
      sendMail({
        to: item.to,
        subject: item.subject,
        text: item.text,
        html: item.html,
      })
    )
  );
}

async function uploadAdmissionFiles(files, admissionEmail) {
  const folderSuffix = normalizeText(admissionEmail) || "unknown";
  const getFile = (key) => (Array.isArray(files?.[key]) ? files[key][0] : null);

  const [passport_photo, adhar, UDID, disability, Degree_memo, doctor] = await Promise.all([
    uploadFile(getFile("passport_photo"), folderSuffix),
    uploadFile(getFile("adhar"), folderSuffix),
    uploadFile(getFile("UDID"), folderSuffix),
    uploadFile(getFile("disability"), folderSuffix),
    uploadFile(getFile("Degree_memo"), folderSuffix),
    uploadFile(getFile("doctor"), folderSuffix),
  ]);

  return { passport_photo, adhar, UDID, disability, Degree_memo, doctor };
}

router.post("/saveAdmission", uploadFields, async (req, res) => {
  try {
    const payload = {
      name: normalizeText(req.body.name),
      email: normalizeText(req.body.email).toLowerCase(),
      mobile: normalizeText(req.body.mobile),
      dob: normalizeText(req.body.dob),
      gender: normalizeText(req.body.gender),
      state: normalizeText(req.body.state),
      district: normalizeText(req.body.district),
      course: normalizeText(req.body.course),
      disabilityStatus: normalizeText(req.body.disabilityStatus),
      education: normalizeText(req.body.education),
      enrolledCourse: normalizeText(req.body.enrolledCourse),
      basicComputerKnowledge: normalizeText(req.body.basicComputerKnowledge),
      basicEnglishSkills: normalizeText(req.body.basicEnglishSkills),
      ScreenReader: normalizeText(req.body.ScreenReader),
      declaration: ["true", "on", "1"].includes(String(req.body.declaration).toLowerCase()),
      status: "SUBMITTED",
      decisionDone: false,
    };

    const required = ["name", "email", "mobile", "dob", "gender", "state", "district", "course"];
    const missing = required.filter((field) => !payload[field]);
    if (missing.length) {
      return res.status(400).json({ error: "Missing required fields", details: missing });
    }

    if (!payload.declaration) {
      return res.status(400).json({ error: "Please accept declaration" });
    }

    const cloudinaryDocs = await uploadAdmissionFiles(req.files, payload.email);
    const admission = await Admission.create({ ...payload, ...cloudinaryDocs });

    const mails = [];
    if (env.headEmail) {
      mails.push({
        to: env.headEmail,
        ...templates.submissionToHead(admission),
      });
    }
    mails.push({
      to: admission.email,
      ...templates.submissionToUser(admission),
    });
    await sendBulkMails(mails);

    await createNotification({
      title: "New admission submitted",
      message: `${admission.name} submitted an application for ${admission.course}.`,
      type: "ADMISSION_SUBMITTED",
      relatedAdmission: admission._id,
      targetRole: "HEAD",
      actor: null,
    });

    return res.status(201).json({ message: "Admission submitted successfully", data: admission });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        error: "Duplicate entry",
        detail: "You have already submitted with this email or mobile.",
      });
    }
    return res.status(500).json({ error: "Failed to save admission", detail: err.message });
  }
});

router.use(requireAuth);

router.get("/submitted", async (req, res) => {
  const filter = { status: "SUBMITTED", ...buildAdmissionForRole(req.user.role, req.user.course) };
  const data = await Admission.find(filter).sort({ createdAt: -1 });
  res.json(data);
});

router.get("/head-accepted", async (req, res) => {
  const filter = { status: "HEAD_ACCEPTED", ...buildAdmissionForRole(req.user.role, req.user.course) };
  const data = await Admission.find(filter).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/head-rejected", async (req, res) => {
  const filter = { status: "HEAD_REJECTED", ...buildAdmissionForRole(req.user.role, req.user.course) };
  const data = await Admission.find(filter).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/teacher-head-accepted", async (req, res) => {
  const filter = { status: "HEAD_ACCEPTED", ...buildAdmissionForRole(req.user.role, req.user.course) };
  const data = await Admission.find(filter).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/teacher-accepted", async (req, res) => {
  const filter = { status: "SELECTED", ...buildAdmissionForRole(req.user.role, req.user.course) };
  const data = await Admission.find(filter).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/teacher-rejected", async (req, res) => {
  const filter = { status: "REJECTED", ...buildAdmissionForRole(req.user.role, req.user.course) };
  const data = await Admission.find(filter).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/head/final-selected", allowRoles("HEAD"), async (_req, res) => {
  const data = await Admission.find({ status: "SELECTED" }).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/head/final-rejected", allowRoles("HEAD"), async (_req, res) => {
  const data = await Admission.find({ status: "REJECTED" }).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/interview_required", async (req, res) => {
  const filter = {
    status: { $in: ["INTERVIEW_SCHEDULED"] },
    ...buildAdmissionForRole(req.user.role, req.user.course),
  };
  const data = await Admission.find(filter).sort({ updatedAt: -1 });
  res.json(data);
});

router.get("/get-data", async (req, res) => {
  const baseFilter = buildAdmissionForRole(req.user.role, req.user.course);
  const [students, counts] = await Promise.all([
    Admission.find(baseFilter).sort({ createdAt: -1 }),
    Admission.aggregate([
      { $match: baseFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = counts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  res.json({ students, statusCounts });
});

router.get("/notifications", async (req, res) => {
  try {
    const days = String(req.query.days || "all").toLowerCase();
    const rawLimit = Number(req.query.limit || 50);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 50;

    const filter = buildNotificationAccessFilter(req.user);
    if (days !== "all") {
      const parsedDays = Number(days);
      if (Number.isFinite(parsedDays) && parsedDays > 0) {
        const since = new Date(Date.now() - parsedDays * 24 * 60 * 60 * 1000);
        filter.createdAt = { $gte: since };
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const userId = mongoose.Types.ObjectId.isValid(req.user._id)
      ? new mongoose.Types.ObjectId(req.user._id)
      : req.user._id;

    const unreadCount = await Notification.countDocuments({
      ...filter,
      isReadBy: { $ne: userId },
    });

    const mapped = notifications.map((item) => ({
      ...item,
      isRead: Array.isArray(item.isReadBy)
        ? item.isReadBy.some((id) => String(id) === String(req.user._id))
        : false,
    }));

    return res.json({ notifications: mapped, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load notifications", detail: err.message });
  }
});

router.put("/notifications/:id/read", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    const userId = mongoose.Types.ObjectId.isValid(req.user._id)
      ? new mongoose.Types.ObjectId(req.user._id)
      : req.user._id;

    const filter = buildNotificationAccessFilter(req.user, { _id: req.params.id });
    const updated = await Notification.findOneAndUpdate(
      filter,
      { $addToSet: { isReadBy: userId } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Notification not found" });
    return res.json({ message: "Notification marked as read" });
  } catch (err) {
    return res.status(500).json({ error: "Unable to update notification", detail: err.message });
  }
});

router.put("/notifications/read-all", async (req, res) => {
  try {
    const userId = mongoose.Types.ObjectId.isValid(req.user._id)
      ? new mongoose.Types.ObjectId(req.user._id)
      : req.user._id;
    const filter = buildNotificationAccessFilter(req.user, { isReadBy: { $ne: userId } });

    const result = await Notification.updateMany(filter, {
      $addToSet: { isReadBy: userId },
    });

    return res.json({
      message: "All notifications marked as read",
      updatedCount: result.modifiedCount || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: "Unable to update notifications", detail: err.message });
  }
});

router.put("/head/approve/:id", allowRoles("HEAD"), async (req, res) => {
  const admission = await Admission.findByIdAndUpdate(
    req.params.id,
    {
      status: "HEAD_ACCEPTED",
      headActionBy: req.user._id,
      decisionDone: false,
    },
    { new: true }
  );

  if (!admission) return res.status(404).json({ error: "Admission not found" });

  const courseTeachers = getCourseTeachers(admission.course);
  await sendBulkMails(
    courseTeachers.map((teacher) => ({
      to: teacher.email,
      ...templates.headAcceptedToTeacher({ admission, teacher }),
    }))
  );

  await createNotification({
    title: "Head approved application",
    message: `${admission.name} was approved by head for ${admission.course}.`,
    type: "HEAD_APPROVED",
    relatedAdmission: admission._id,
    targetRole: "TEACHER",
    targetCourse: admission.course,
    actor: req.user,
  });

  return res.json({ message: "Admission approved by head", data: admission });
});

router.put("/head/reject/:id", allowRoles("HEAD"), async (req, res) => {
  const admission = await Admission.findByIdAndUpdate(
    req.params.id,
    {
      status: "HEAD_REJECTED",
      headActionBy: req.user._id,
      decisionDone: true,
    },
    { new: true }
  );

  if (!admission) return res.status(404).json({ error: "Admission not found" });

  await sendMail({
    to: admission.email,
    ...templates.headRejectedToUser(admission),
  });

  await createNotification({
    title: "Head rejected application",
    message: `${admission.name}'s application was rejected by head.`,
    type: "HEAD_REJECTED",
    relatedAdmission: admission._id,
    targetRole: "HEAD",
    actor: req.user,
  });

  return res.json({ message: "Admission rejected by head", data: admission });
});

router.put("/head/delete/:id", allowRoles("HEAD"), async (req, res) => {
  const admission = await Admission.findByIdAndDelete(req.params.id);
  if (!admission) return res.status(404).json({ error: "Admission not found" });

  await createNotification({
    title: "Application deleted",
    message: `${admission.name}'s application was deleted by ${req.user.role}.`,
    type: "ADMISSION_DELETED",
    relatedAdmission: admission._id,
    targetRole: "HEAD",
    actor: req.user,
  });

  return res.json({ message: "Admission deleted", data: admission });
});

router.post("/schedule-interview/:id", allowRoles("TEACHER", "HEAD"), async (req, res) => {
  const { date, time, platform, link } = req.body || {};

  if (!normalizeText(date) || !normalizeText(time) || !normalizeText(platform) || !normalizeText(link)) {
    return res.status(400).json({ error: "date, time, platform and link are required" });
  }

  const filter = { _id: req.params.id };
  if (req.user.role === "TEACHER" && req.user.course) {
    filter.course = req.user.course;
  }

  const admission = await Admission.findOneAndUpdate(
    filter,
    {
      interview: { date, time, platform, link },
      status: "INTERVIEW_SCHEDULED",
      teacherActionBy: req.user._id,
    },
    { new: true }
  );

  if (!admission) {
    return res.status(404).json({ error: "Admission not found" });
  }

  await sendMail({
    to: admission.email,
    ...templates.interviewScheduledToUser(admission),
  });

  await createNotification({
    title: "Interview scheduled",
    message: `Interview scheduled for ${admission.name} on ${date} at ${time}.`,
    type: "INTERVIEW_SCHEDULED",
    relatedAdmission: admission._id,
    targetRole: "ALL",
    targetCourse: admission.course,
    actor: req.user,
  });

  return res.json({ message: "Interview scheduled", data: admission });
});

router.put("/final/approve/:id", allowRoles("TEACHER", "HEAD"), async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === "TEACHER" && req.user.course) filter.course = req.user.course;

  const admission = await Admission.findOneAndUpdate(
    filter,
    {
      status: "SELECTED",
      decisionDone: true,
      teacherActionBy: req.user._id,
    },
    { new: true }
  );

  if (!admission) return res.status(404).json({ error: "Admission not found" });

  await sendMail({
    to: admission.email,
    ...templates.finalSelectedToUser(admission),
  });

  await createNotification({
    title: "Final admission selected",
    message: `${admission.name} was marked as selected.`,
    type: "FINAL_SELECTED",
    relatedAdmission: admission._id,
    targetRole: "ALL",
    targetCourse: admission.course,
    actor: req.user,
  });

  return res.json({ message: "Final approval complete", data: admission });
});

router.put("/final/reject/:id", allowRoles("TEACHER", "HEAD"), async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role === "TEACHER" && req.user.course) filter.course = req.user.course;

  const admission = await Admission.findOneAndUpdate(
    filter,
    {
      status: "REJECTED",
      decisionDone: true,
      teacherActionBy: req.user._id,
    },
    { new: true }
  );

  if (!admission) return res.status(404).json({ error: "Admission not found" });

  await sendMail({
    to: admission.email,
    ...templates.finalRejectedToUser(admission),
  });

  await createNotification({
    title: "Final admission rejected",
    message: `${admission.name} was marked as rejected.`,
    type: "FINAL_REJECTED",
    relatedAdmission: admission._id,
    targetRole: "ALL",
    targetCourse: admission.course,
    actor: req.user,
  });

  return res.json({ message: "Final rejection complete", data: admission });
});

module.exports = router;
