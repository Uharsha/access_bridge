const express = require("express");
const multer = require("multer");

const Admission = require("../models/Admission");
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
    status: { $in: ["HEAD_ACCEPTED", "INTERVIEW_SCHEDULED"] },
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

// Notifications disabled by request, keep endpoints for UI compatibility.
router.get("/notifications", async (_req, res) => {
  res.json({ notifications: [], unreadCount: 0 });
});

router.put("/notifications/:id/read", async (_req, res) => {
  res.json({ message: "Notifications are disabled" });
});

router.put("/notifications/read-all", async (_req, res) => {
  res.json({ message: "Notifications are disabled" });
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

  return res.json({ message: "Admission rejected by head", data: admission });
});

router.put("/head/delete/:id", allowRoles("HEAD"), async (req, res) => {
  const admission = await Admission.findByIdAndDelete(req.params.id);
  if (!admission) return res.status(404).json({ error: "Admission not found" });

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

  return res.json({ message: "Final rejection complete", data: admission });
});

module.exports = router;
