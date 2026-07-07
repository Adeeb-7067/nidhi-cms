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
    // Large APK uploads can take several minutes through the dev proxy.
    timeout: 600_000,
    proxyTimeout: 600_000,
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
      // No manualChunks: grouping recharts/framer-motion/lottie/firebase into
      // fixed vendor chunks forced Rollup to also park shared React/ReactDOM
      // CJS-interop shims inside those chunks (whichever chunk a CJS-interop
      // lib lands in first "wins" the shims) — the entry then had to eagerly
      // import that chunk just to bootstrap React, defeating route-level lazy
      // loading. Letting Rollup's default splitting follow actual dynamic
      // import boundaries keeps each lazy page's heavy deps out of the
      // eagerly-loaded entry. (A prior *more aggressive* manual react/radix
      // split broke production with "Cannot read properties of undefined
      // (reading 'forwardRef')" — this removes chunking rules entirely rather
      // than adjusting them, to stay on Rollup's well-tested automatic path.)
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
        "/uploads": apiProxy,
        "/socket.io": socketProxy,
      },
      // Dev-mode only: Vite serves each source file as its own on-demand
      // transform, so a route with a deep module graph (dashboards pulling in
      // recharts/framer-motion + many sub-components) can take 10+ seconds to
      // finish loading the *first* time it's visited in a session, even though
      // the underlying API responds in under a second. Pre-transforming these
      // entry points at server boot moves that cost off the first click.
      warmup: {
        clientFiles: [
          "./src/components/layout/AuthenticatedShell.tsx",
          "./src/components/layout/AppLayout.tsx",
          "./src/components/layout/Sidebar.tsx",
          "./src/components/layout/Navbar.tsx",
          "./src/pages/hrm/Dashboard.tsx",
          "./src/modules/hrm/HrmRichDashboard.tsx",
          "./src/pages/admin/Dashboard.tsx",
          "./src/pages/sales/Dashboard.tsx",
          "./src/pages/finance/Dashboard.tsx",
        ],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": apiProxy,
        "/uploads": apiProxy,
        "/socket.io": { ...socketProxy, configure: undefined },
      },
    },
  };
});
