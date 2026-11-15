/**
 * Builds a self-contained copy of the web app in <repo>/.deploy/webapp, ready to upload to a host.
 *
 * Why a copy: inside the monorepo, dependencies live in the root node_modules and @flatme/shared is a
 * workspace link, so a host that only receives apps/webapp can't run it. The copy vendors the shared
 * package, installs its own dependencies and builds Next.js in "standalone" mode, which produces
 * .next/standalone/server.js plus only the files that server needs.
 *
 *   NEXT_PUBLIC_API_URL=https://…/api NEXT_PUBLIC_SITE_URL=https://… node apps/webapp/scripts/bundle-standalone.mjs
 *   node .deploy/webapp/.next/standalone/server.js      # try it locally (PORT=3000 by default)
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(app, "../..");
const out = join(repo, ".deploy/webapp");
const run = (cmd, env = {}) => execSync(cmd, { cwd: out, stdio: "inherit", env: { ...process.env, ...env } });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of ["src", "public", "next.config.ts", "postcss.config.mjs", "tsconfig.json"]) cpSync(join(app, f), join(out, f), { recursive: true });
cpSync(join(repo, "packages/shared"), join(out, "vendor/shared"), { recursive: true, filter: (p) => !p.includes("node_modules") });

// The copy is its own root, so the shared compiler settings must sit inside it.
cpSync(join(repo, "tsconfig.base.json"), join(out, "tsconfig.base.json"));
writeFileSync(join(out, "tsconfig.json"), readFileSync(join(out, "tsconfig.json"), "utf8").replace("../../tsconfig.base.json", "./tsconfig.base.json"));

const pkg = JSON.parse(readFileSync(join(app, "package.json"), "utf8"));
pkg.dependencies["@flatme/shared"] = "file:./vendor/shared";
pkg.scripts = { build: "next build", start: "node .next/standalone/server.js" };
pkg.engines = { node: ">=20.9.0" };
delete pkg.devDependencies.vitest;
writeFileSync(join(out, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

run("npm install --no-audit --no-fund");
run("npx next build", { WEBAPP_STANDALONE: "1" });

// The standalone server doesn't include static assets by default; put them where it looks for them.
cpSync(join(out, ".next/static"), join(out, ".next/standalone/.next/static"), { recursive: true });
cpSync(join(out, "public"), join(out, ".next/standalone/public"), { recursive: true });
// Not needed at run time, and they would blow the upload size limit.
for (const d of ["node_modules", ".next/cache", "vendor"]) rmSync(join(out, d), { recursive: true, force: true });
console.log(`webapp: standalone build ready in ${out}`);
