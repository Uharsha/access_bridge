const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const env = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const admissionRoutes = require("./routes/admissionRoutes");

const app = express();

const isLocalDevOrigin = (origin = "") => /^https?:\/\/localhost(:\d+)?$/i.test(String(origin).trim());

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (env.corsOrigins.includes(origin)) return callback(null, true);
    if (isLocalDevOrigin(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tti-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/admission", admissionRoutes);

app.use((err, _req, res, _next) => {
  if (err?.name === "MulterError") {
    return res.status(400).json({ error: "File upload error", detail: err.message });
  }
  return res.status(500).json({ error: "Unexpected server error", detail: err.message });
});

async function start() {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is missing. Add it in .env");
  }

  await mongoose.connect(env.mongoUri);
  console.log("MongoDB Atlas connected");

  app.listen(env.port, () => {
    console.log(`TTI backend running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error("Server start failed:", err.message);
  process.exit(1);
});
