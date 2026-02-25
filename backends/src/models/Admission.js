const mongoose = require("mongoose");

const statuses = [
  "SUBMITTED",
  "HEAD_ACCEPTED",
  "HEAD_REJECTED",
  "INTERVIEW_SCHEDULED",
  "SELECTED",
  "REJECTED",
  "DELETED",
];

const interviewSchema = new mongoose.Schema(
  {
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    platform: { type: String, default: "" },
    link: { type: String, default: "" },
  },
  { _id: false }
);

const admissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    dob: { type: String, required: true },
    gender: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    course: { type: String, required: true },
    disabilityStatus: { type: String, default: "" },
    education: { type: String, default: "" },
    enrolledCourse: { type: String, default: "" },
    basicComputerKnowledge: { type: String, default: "" },
    basicEnglishSkills: { type: String, default: "" },
    ScreenReader: { type: String, default: "" },
    declaration: { type: Boolean, default: false },

    passport_photo: { type: String, default: "" },
    adhar: { type: String, default: "" },
    UDID: { type: String, default: "" },
    disability: { type: String, default: "" },
    Degree_memo: { type: String, default: "" },
    doctor: { type: String, default: "" },

    status: { type: String, enum: statuses, default: "SUBMITTED" },
    interview: { type: interviewSchema, default: () => ({}) },
    decisionDone: { type: Boolean, default: false },

    headActionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    teacherActionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admission", admissionSchema);
