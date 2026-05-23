import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const appRoot = path.resolve(import.meta.dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, "");
  const rawPort = env.PORT || process.env.PORT || "5173";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = env.BASE_PATH || process.env.BASE_PATH || "/";
  /** Used only when `VITE_API_BASE_URL` is unset (relative `/api` on the dev server). */
  const apiProxyTarget =
    env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8080";

  const apiProxy = {
    target: apiProxyTarget,
    changeOrigin: true,
  };

  const socketProxy = {
    target: apiProxyTarget,
    changeOrigin: true,
    ws: true,
    secure: false,
    configure: (proxy: {
      on: (event: string, handler: (err: Error, _req: unknown, res: { headersSent?: boolean; writeHead?: Function; end?: Function }) => void) => void;
    }) => {
      proxy.on("error", (err, _req, res) => {
        const code = "code" in err ? String(err.code) : "";
        if (code === "ECONNRESET" || code === "ECONNREFUSED") return;
        if (res && typeof res.writeHead === "function" && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end?.("Socket proxy error");
        }
      });
    },
  };

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(appRoot, "src"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: appRoot,
    build: {
      outDir: path.resolve(appRoot, "dist/public"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Only split heavy libs that do not share React init with the app shell.
          // Custom react/radix chunks caused circular vendor ↔ vendor-react loads and
          // "Cannot read properties of undefined (reading 'forwardRef')" in production.
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
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
      proxy: {
        "/api": apiProxy,
        "/socket.io": socketProxy,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": apiProxy,
        "/socket.io": { ...socketProxy, configure: undefined },
      },
    },
  };
});
