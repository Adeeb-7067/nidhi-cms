import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, MobileNavSheet } from "./Sidebar";
import { Navbar } from "./Navbar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { EmployeeWarningBanner } from "@/components/warnings/EmployeeWarningBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteChunkSkeleton } from "@/components/loading";

/** Role dashboard roots where active employee warnings are shown at the top. */
const EMPLOYEE_DASHBOARD_PATHS = new Set([
  "/dev",
  "/hrm",
  "/finance",
  "/sales/bde",
  "/marketing",
  "/ca",
]);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const showEmployeeWarnings = EMPLOYEE_DASHBOARD_PATHS.has(location);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} className="hidden md:flex" />
      <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <ImpersonationBanner />
        <main className="dialog-scroll relative flex-1 overflow-y-auto page-shell">
          <div className="app-shell-container py-3 sm:py-5 lg:py-6">
            <ErrorBoundary>
              <React.Suspense
                fallback={<RouteChunkSkeleton />}
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
                    {showEmployeeWarnings ? <EmployeeWarningBanner /> : null}
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
