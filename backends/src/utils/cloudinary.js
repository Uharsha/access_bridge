const { v2: cloudinary } = require("cloudinary");
const env = require("../config/env");

const canUpload =
  Boolean(env.cloudinaryCloudName) &&
  Boolean(env.cloudinaryApiKey) &&
  Boolean(env.cloudinaryApiSecret);

if (canUpload) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

function fileBufferToDataUri(file) {
  if (!file?.buffer) return "";
  const mime = file.mimetype || "application/octet-stream";
  return `data:${mime};base64,${file.buffer.toString("base64")}`;
}

async function uploadFile(file, folderSuffix = "") {
  if (!canUpload) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_* env vars.");
  }
  if (!file) return "";

  const folder = folderSuffix
    ? `${env.cloudinaryFolder}/${folderSuffix}`
    : env.cloudinaryFolder;

  const result = await cloudinary.uploader.upload(fileBufferToDataUri(file), {
    folder,
    resource_type: "auto",
    overwrite: false,
  });

  return result?.secure_url || "";
}

module.exports = {
  uploadFile,
};
