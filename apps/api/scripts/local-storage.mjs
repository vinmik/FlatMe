/**
 * Stand-in for Azure Blob Storage during local development, so photo uploads work without Azure.
 * The local API hands out upload links pointing at http://127.0.0.1:10000 (see LocalUploadUrlSigner);
 * this accepts those uploads, keeps the files in apps/api/.local-storage and serves them back.
 *
 *   npm run storage -w apps/api
 */
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 10000;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", ".local-storage");
const TYPES = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic" };
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,HEAD,PUT,OPTIONS", "Access-Control-Allow-Headers": "*" };

createServer((req, res) => {
  const end = (status, headers = {}) => res.writeHead(status, { ...CORS, ...headers }).end();
  const file = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!file.startsWith(ROOT + sep)) return end(400);

  if (req.method === "OPTIONS") return end(204);
  if (req.method === "PUT") {
    mkdirSync(dirname(file), { recursive: true });
    return req.pipe(createWriteStream(file)).on("finish", () => end(201)).on("error", () => end(500));
  }
  if (req.method === "GET" || req.method === "HEAD") {
    if (!existsSync(file)) return end(404);
    res.writeHead(200, { ...CORS, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    return req.method === "HEAD" ? res.end() : createReadStream(file).pipe(res);
  }
  end(405);
}).listen(PORT, "127.0.0.1", () => console.log(`Local photo storage on http://127.0.0.1:${PORT} → ${ROOT}`));
