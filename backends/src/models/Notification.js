const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "INFO" },
    relatedAdmission: { type: mongoose.Schema.Types.ObjectId, ref: "Admission", default: null },
    targetRole: { type: String, enum: ["ALL", "HEAD", "TEACHER"], default: "ALL" },
    targetCourse: { type: String, default: "" },
    isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      name: { type: String, default: "System" },
      role: { type: String, default: "SYSTEM" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
