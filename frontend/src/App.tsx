import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as AppToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { QUERY_GC, QUERY_STALE } from "@/lib/query-config";
import { AppLoadingScreen } from "@/components/loading";

const Login = React.lazy(() => import("@/pages/login"));
const ForgotPassword = React.lazy(() => import("@/pages/auth/forgot-password"));

function getHttpStatus(error: Error): number | undefined {
  return (error as Error & { response?: { status?: number } }).response?.status;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE.list,
      gcTime: QUERY_GC,
      retry: (failureCount, error) => {
        const status = getHttpStatus(error);
        if (status && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: { retry: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <React.Suspense fallback={<AppLoadingScreen message="Loading sign in" />}>
          <Login />
        </React.Suspense>
      </Route>
      <Route path="/forgot-password">
        <React.Suspense fallback={<AppLoadingScreen message="Loading" />}>
          <ForgotPassword />
        </React.Suspense>
      </Route>

      <Route path="/">
        <Redirect to="/login" />
      </Route>

      <Route>
        <AuthenticatedShell />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <RealtimeProvider>
                <Router />
              </RealtimeProvider>
            </AuthProvider>
          </WouterRouter>
          <AppToaster />
          <SonnerToaster position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
