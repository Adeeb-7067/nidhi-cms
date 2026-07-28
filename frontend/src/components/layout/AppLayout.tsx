import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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

/** Pathname only — ignore query so filter/search URL updates do not remount the page. */
function routeTransitionKey(location: string): string {
  const q = location.indexOf("?");
  return q === -1 ? location : location.slice(0, q);
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const pathKey = routeTransitionKey(location);
  const showEmployeeWarnings = EMPLOYEE_DASHBOARD_PATHS.has(pathKey);

  const pageBody = (
    <>
      {showEmployeeWarnings ? <EmployeeWarningBanner /> : null}
      {children}
    </>
  );

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
              <React.Suspense fallback={<RouteChunkSkeleton />}>
                {reduceMotion ? (
                  <div className="space-y-6">{pageBody}</div>
                ) : (
                  // wait: avoid stacking two PageOutlet trees (sync showed the new page twice)
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={pathKey}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      {pageBody}
                    </motion.div>
                  </AnimatePresence>
                )}
              </React.Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
