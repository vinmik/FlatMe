import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type UserConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export function createViteConfig(mode: string): UserConfig {
  if (mode === "test") return base();
  const env = loadEnv(mode, root, "VITE_");
  // Production builds run without admin auth unless VITE_ADMIN_AUTH_DISABLED is set explicitly
  // (the API is deployed with ADMIN_AUTH_DISABLED=true for now). Set it to "false" to re-enable sign-in.
  const authDisabled = env.VITE_ADMIN_AUTH_DISABLED ?? process.env.VITE_ADMIN_AUTH_DISABLED ?? (mode === "production" ? "true" : undefined);

  return { ...base(), define: authDisabled === undefined ? {} : { "import.meta.env.VITE_ADMIN_AUTH_DISABLED": JSON.stringify(authDisabled) } };
}

function base(): UserConfig {
  return {
    // Pin `root` to this package so Vite never picks up config/files from parent directories.
    root,
    envDir: root,
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: { port: 5174, strictPort: false },
    preview: { port: 4174 },
    build: {
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router"],
            charts: ["recharts"],
            motion: ["motion/react"],
          },
        },
      },
    },
  };
}

export default defineConfig(({ mode }) => createViteConfig(mode));