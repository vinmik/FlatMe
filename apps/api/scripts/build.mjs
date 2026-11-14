// Bundles the Functions app into a single CommonJS file. Everything except @azure/functions
// (resolved from node_modules at runtime so the host and the worker share one instance) is inlined,
// including the TypeScript sources of @flatme/shared.
import { build } from "esbuild";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

rmSync(join(root, "dist"), { recursive: true, force: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/main.ts"],
  outfile: "dist/main.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  minify: false,
  legalComments: "none",
  external: ["@azure/functions"],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  metafile: true,
  logLevel: "warning",
});

const bytes = Object.values(result.metafile.outputs).reduce((n, o) => n + o.bytes, 0);
console.log(`Built dist/main.js (${(bytes / 1024).toFixed(0)} KiB incl. sourcemap)`);
