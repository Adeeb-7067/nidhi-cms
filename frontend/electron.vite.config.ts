import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const appRoot = path.resolve(import.meta.dirname);

/**
 * Separate Vite config for the Electron desktop build.
 * Key differences from the standard web config:
 *  - base: './'  so assets resolve correctly under file:// protocol
 *  - No dev-server proxy (Electron points directly at the remote API URL)
 *  - VITE_ELECTRON='true' baked in so App.tsx switches to hash routing
 */
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: appRoot,
  build: {
    outDir: path.resolve(appRoot, "dist/electron"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const nm = (pkg: string) =>
            id.includes(`node_modules/${pkg}`) || id.includes(`node_modules\\${pkg}`);
          if (nm("recharts") || nm("framer-motion") || nm("lottie-react") || nm("lottie-web")) {
            return "vendor-charts-motion";
          }
          if (nm("date-fns") || nm("jspdf") || nm("jspdf-autotable")) {
            return "vendor-utils";
          }
          if (nm("firebase")) {
            return "vendor-firebase";
          }
        },
      },
    },
  },
  define: {
    "import.meta.env.VITE_ELECTRON": JSON.stringify("true"),
    // Public assets use absolute paths (e.g. /logo.png) which break under file://.
    // Override to a relative path so they resolve correctly from the dist directory.
    "import.meta.env.VITE_APP_LOGO": JSON.stringify("./logo.png"),
    // VITE_API_BASE_URL must be set in the environment when running this build:
    //   VITE_API_BASE_URL=https://your-api.domain.com npm run build:electron
    ...(process.env.VITE_API_BASE_URL
      ? { "import.meta.env.VITE_API_BASE_URL": JSON.stringify(process.env.VITE_API_BASE_URL) }
      : {}),
  },
});
