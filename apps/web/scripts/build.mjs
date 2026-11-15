// Copies src/ to dist/ and writes dist/config.js from build-time env vars.
//   WEB_API_BASE_URL  FlatMe API base (incl. /api). Empty -> live stats/listings stay hidden.
//   WEB_APK_URL       Android APK download link.
import { cpSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");

const config = {
  apiBaseUrl: (process.env.WEB_API_BASE_URL ?? "").replace(/\/+$/, ""),
  apkUrl: process.env.WEB_APK_URL || "https://github.com/vinmik/FlatMe/releases/latest/download/FlatMe.apk",
};

rmSync(out, { recursive: true, force: true });
cpSync(join(root, "src"), out, { recursive: true });
writeFileSync(join(out, "config.js"), `window.FLATME_CONFIG = ${JSON.stringify(config)};\n`);
console.log(`web: built dist/ (api: ${config.apiBaseUrl || "none"})`);
