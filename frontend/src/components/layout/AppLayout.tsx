import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLoadingScreen } from "@/components/loading";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        />
        <ImpersonationBanner />
        <main className="dialog-scroll relative flex-1 overflow-y-auto page-shell">
          <div className="app-shell-container py-4 sm:py-5 lg:py-6">
            <ErrorBoundary>
              <React.Suspense
                fallback={
                  <AppLoadingScreen
                    variant="embedded"
                    message="Loading page"
                    submessage="Just a moment…"
                  />
                }
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={location}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-6"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
