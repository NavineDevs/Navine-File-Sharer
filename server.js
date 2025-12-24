import express from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const app = express();
const PORT = 3000;

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(ROOT, "uploads");
const CHUNKS = path.join(ROOT, "chunks");
const DB = path.join(ROOT, "db.json");

const MAX_FILE = 10 * 1024 * 1024 * 1024; // 10GB
const CHUNK = 50 * 1024 * 1024;

const ALLOWED = new Set([
  "zip","rar","7z","pdf","png","jpg","jpeg","mp4","mp3",
  "exe","apk","iso","txt","json"
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

app.post("/api/init", async (req, res) => {
  const { filename, size, password } = req.body;
  if (!filename || !size) return res.sendStatus(400);
  if (size > MAX_FILE) return res.status(413).json({ error: "Max 10GB" });
  if (!ALLOWED.has(ext(filename))) return res.status(400).json({ error: "Extension blocked" });

  const uploadId = nanoid();
  const fileId = nanoid(10);
  fs.mkdirSync(path.join(CHUNKS, uploadId));

  const db = load();
  db.files[fileId] = {
    uploadId,
    filename,
    size,
    password: password ? await bcrypt.hash(password, 10) : null
  };
  save(db);

  res.json({ uploadId, fileId, chunkSize: CHUNK });
});

app.post("/api/chunk", express.raw({ limit: `${CHUNK}b` }), (req, res) => {
  const { uploadId, index } = req.query;
  const dir = path.join(CHUNKS, uploadId);
  fs.writeFileSync(path.join(dir, `${index}.part`), req.body);
  res.json({ ok: true });
});

app.post("/api/finish", (req, res) => {
  const { uploadId, fileId, total } = req.body;
  const db = load();
  const meta = db.files[fileId];

  const out = path.join(UPLOADS, `${fileId}-${meta.filename}`);
  const ws = fs.createWriteStream(out);

  for (let i = 0; i < total; i++) {
    ws.write(fs.readFileSync(path.join(CHUNKS, uploadId, `${i}.part`)));
  }
  ws.end();

  fs.rmSync(path.join(CHUNKS, uploadId), { recursive: true, force: true });
  res.json({ link: `/download/${fileId}` });
});

app.get("/download/:id", async (req, res) => {
  const db = load();
  const f = db.files[req.params.id];
  if (!f) return res.sendStatus(404);

  if (f.password) {
    const p = req.query.password;
    if (!p || !(await bcrypt.compare(p, f.password))) {
      return res.status(401).send("Password required");
    }
  }

  res.download(path.join(UPLOADS, `${req.params.id}-${f.filename}`));
});

app.listen(PORT, () =>
  console.log(`🖤 Navine File Sharer running → http://localhost:${PORT}`)
);
