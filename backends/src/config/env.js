const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const candidateEnvFiles = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"), // backend/.env
  path.resolve(__dirname, "../../../.env"), // project-root .env
  path.resolve(__dirname, "../../.env.example"), // backend/.env.example fallback (dev only)
];

candidateEnvFiles.forEach((envFile) => {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
});

const env = {
  port: Number(process.env.PORT || 5530),
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "tti/admissions",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || process.env.GMAIL_USER || "",
  smtpPass: process.env.SMTP_PASS || process.env.GMAIL_PASS || "",
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || "",
  headEmail: process.env.HEAD_EMAIL || "",
  baseUrl: process.env.BASE_URL || "",
};

module.exports = env;
