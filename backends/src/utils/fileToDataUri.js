function fileToDataUri(file) {
  if (!file || !file.buffer) return "";
  const mime = file.mimetype || "application/octet-stream";
  return `data:${mime};base64,${file.buffer.toString("base64")}`;
}

module.exports = fileToDataUri;
