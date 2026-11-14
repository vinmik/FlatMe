// Produces apps/api/.deploy/ — a self-contained Flex Consumption package:
//   host.json, package.json (only @azure/functions), dist/, node_modules/ (prod only).
// Publish with `func azure functionapp publish <app> --javascript` from inside .deploy,
// or zip its *contents* and use `az functionapp deployment source config-zip`.
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".deploy");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

if (!existsSync(join(root, "dist", "main.js"))) throw new Error("dist/main.js missing — run `npm run build` first");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "dist"), join(out, "dist"), { recursive: true });
cpSync(join(root, "host.json"), join(out, "host.json"));

writeFileSync(
  join(out, "package.json"),
  JSON.stringify(
    {
      name: pkg.name.replace("@flatme/", "flatme-"),
      version: pkg.version,
      private: true,
      main: "dist/main.js",
      engines: { node: ">=22" },
      dependencies: { "@azure/functions": pkg.dependencies["@azure/functions"] },
    },
    null,
    2,
  ) + "\n",
);

// Installed in isolation (not as a workspace) so only production deps land in the package.
execSync("npm install --omit=dev --no-audit --no-fund --no-package-lock --workspaces=false", {
  cwd: out,
  stdio: "inherit",
});

console.log(`Deployment package ready: ${out}`);
