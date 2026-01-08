const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// CONFIG
// =======================
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
const ALLOWED_EXTENSIONS =
  /\.(zip|rar|7z|pdf|png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|mkv|mp3|wav|ogg|apk|exe|iso|txt|json)$/i;

// =======================
// FOLDERS
// =======================
const UPLOAD_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// =======================
// MIDDLEWARE
// =======================
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

// =======================
// MULTER SETUP
// =======================
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXTENSIONS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  }
});

// =======================
// ROUTES
// =======================
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded"
    });
  }

  const protocol = req.header("x-forwarded-proto") || req.protocol;
  const fileUrl = `${protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.json({
    success: true,
    name: req.file.filename,
    size: req.file.size,
    url: fileUrl
  });
});

// =======================
// AUTO CLEANUP (7 days)
// =======================
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

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
}, 12 * 60 * 60 * 1000);

// =======================
// 404
// =======================
app.use((req, res) => {
  res.status(404).send("404 Not Found");
});

// =======================
// START
// =======================
app.listen(PORT, () => {
  console.log("🖤⚡ Navine File Sharer running");
  console.log(`→ http://localhost:${PORT}`);
});
