import express from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const app = express();
const PORT = 3000;

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(ROOT, "uploads");
const CHUNKS = path.join(ROOT, "chunks");
const DB = path.join(ROOT, "db.json");

const MAX_FILE = 10 * 1024 * 1024 * 1024; // 10GB
const CHUNK = 50 * 1024 * 1024; // 50MB

const ALLOWED = new Set([
  "zip","rar","7z","pdf","png","jpg","jpeg","gif",
  "mp4","mp3","wav","exe","apk","iso","txt","json"
]);

for (const d of [UPLOADS, CHUNKS, PUBLIC]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify({ files: {} }, null, 2));

app.use(express.json());
app.use(express.static(PUBLIC));

const load = () => JSON.parse(fs.readFileSync(DB));
const save = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));

const ext = f => f.split(".").pop().toLowerCase();
const safe = f => f.replace(/[^a-zA-Z0-9._-]/g, "_");

app.post("/api/init", (req, res) => {
  const { filename, size } = req.body;
  if (!filename || !size) return res.sendStatus(400);
  if (size > MAX_FILE) return res.status(413).json({ error: "Max 10GB" });
  if (!ALLOWED.has(ext(filename))) return res.status(400).json({ error: "Blocked file type" });

  const uploadId = nanoid();
  const fileId = nanoid(8);
  fs.mkdirSync(path.join(CHUNKS, uploadId));

  const cleanName = safe(filename);
  const storedName = `${fileId}-${cleanName}`;

  const db = load();
  db.files[fileId] = { uploadId, storedName };
  save(db);

  res.json({
    uploadId,
    fileId,
    storedName,
    chunkSize: CHUNK,
    url: `/files/${storedName}`
  });
});

app.post("/api/chunk", express.raw({ limit: `${CHUNK}b` }), (req, res) => {
  const { uploadId, index } = req.query;
  const dir = path.join(CHUNKS, uploadId);
  fs.writeFileSync(path.join(dir, `${index}.part`), req.body);
  res.json({ ok: true });
});

app.post("/api/finish", (req, res) => {
  const { uploadId, storedName, total } = req.body;
  const out = path.join(UPLOADS, storedName);
  const ws = fs.createWriteStream(out);

  for (let i = 0; i < total; i++) {
    ws.write(fs.readFileSync(path.join(CHUNKS, uploadId, `${i}.part`)));
  }
  ws.end();

  fs.rmSync(path.join(CHUNKS, uploadId), { recursive: true, force: true });

  res.json({ url: `/files/${storedName}` });
});

app.use("/files", express.static(UPLOADS));

app.listen(PORT, () => {
  console.log("🖤⚡ Navine File Sharer running");
  console.log(`→ http://localhost:${PORT}`);
});
