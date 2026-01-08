const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* =======================
   CONFIG
======================= */
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

const ALLOWED_EXTENSIONS =
  /\.(zip|rar|7z|pdf|png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|mkv|mp3|wav|ogg|apk|exe|iso|txt|json)$/i;

/* =======================
   DIRECTORIES
======================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* =======================
   MIDDLEWARE
======================= */
app.set("trust proxy", true); // important for Render / HTTPS
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

/* =======================
   MULTER SETUP
======================= */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  }
});

/* =======================
   ROUTES
======================= */

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// Upload endpoint (Discord bot compatible)
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded"
    });
  }

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const url = `${protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    url
  });
});

// List files (optional admin feature)
app.get("/files", (_, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "Failed to read files" });
    res.json(files);
  });
});

/* =======================
   AUTO CLEANUP (7 DAYS)
======================= */
const CLEAN_INTERVAL = 12 * 60 * 60 * 1000; // every 12h
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

setInterval(() => {
  const now = Date.now();

  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return;

    files.forEach(file => {
      const filePath = path.join(UPLOAD_DIR, file);

      fs.stat(filePath, (err, stats) => {
        if (err) return;

        if (now - stats.mtimeMs > MAX_AGE) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, CLEAN_INTERVAL);

/* =======================
   ERROR HANDLING
======================= */
app.use((err, _, res, __) => {
  res.status(400).json({
    success: false,
    error: err.message || "Upload failed"
  });
});

/* =======================
   404
======================= */
app.use((_, res) => {
  res.status(404).send("404 Not Found");
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log("🖤⚡ Navine File Sharer running");
  console.log(`→ http://localhost:${PORT}`);
});
