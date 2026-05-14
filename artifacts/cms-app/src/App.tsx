import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy Pages
const Login = React.lazy(() => import("@/pages/login"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
// Admin
const AdminDashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const AdminProjects = React.lazy(() => import("@/pages/admin/Projects"));
const AdminProjectDetail = React.lazy(() => import("@/pages/admin/ProjectDetail"));
const AdminEmployees = React.lazy(() => import("@/pages/admin/Employees"));
const AdminClients = React.lazy(() => import("@/pages/admin/Clients"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin/Analytics"));
const AdminRequests = React.lazy(() => import("@/pages/admin/Requests"));
// Dev
const DevWorkspace = React.lazy(() => import("@/pages/dev/Workspace"));
const DevLogs = React.lazy(() => import("@/pages/dev/Logs"));
const DevBugs = React.lazy(() => import("@/pages/dev/Bugs"));
const DevApk = React.lazy(() => import("@/pages/dev/Apk"));
const DevReports = React.lazy(() => import("@/pages/dev/Reports"));
const DevRequests = React.lazy(() => import("@/pages/dev/Requests"));
// Client
const ClientPortal = React.lazy(() => import("@/pages/client/Portal"));
const ClientAnalytics = React.lazy(() => import("@/pages/client/Analytics"));
const ClientApk = React.lazy(() => import("@/pages/client/Apk"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function AdminPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute allowedRoles={["super_admin"]}>
      <AppLayout>
        <Component />
      </AppLayout>
    </ProtectedRoute>
  );
}

function DevPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute allowedRoles={["developer"]}>
      <AppLayout>
        <Component />
      </AppLayout>
    </ProtectedRoute>
  );
}

function ClientPage({ component: Component }: { component: React.ComponentType }) {
  return (
    <ProtectedRoute allowedRoles={["client"]}>
      <AppLayout>
        <Component />
      </AppLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <React.Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <Switch>
        <Route path="/login" component={Login} />

        {/* Super Admin Routes */}
        <Route path="/admin">
          <AdminPage component={AdminDashboard} />
        </Route>
        <Route path="/admin/projects/:id">
          <AdminPage component={AdminProjectDetail} />
        </Route>
        <Route path="/admin/projects">
          <AdminPage component={AdminProjects} />
        </Route>
        <Route path="/admin/employees">
          <AdminPage component={AdminEmployees} />
        </Route>
        <Route path="/admin/clients">
          <AdminPage component={AdminClients} />
        </Route>
        <Route path="/admin/analytics">
          <AdminPage component={AdminAnalytics} />
        </Route>
        <Route path="/admin/requests">
          <AdminPage component={AdminRequests} />
        </Route>

        {/* Developer Routes */}
        <Route path="/dev">
          <DevPage component={DevWorkspace} />
        </Route>
        <Route path="/dev/logs">
          <DevPage component={DevLogs} />
        </Route>
        <Route path="/dev/bugs">
          <DevPage component={DevBugs} />
        </Route>
        <Route path="/dev/apk">
          <DevPage component={DevApk} />
        </Route>
        <Route path="/dev/reports">
          <DevPage component={DevReports} />
        </Route>
        <Route path="/dev/requests">
          <DevPage component={DevRequests} />
        </Route>

        {/* Client Routes */}
        <Route path="/client">
          <ClientPage component={ClientPortal} />
        </Route>
        <Route path="/client/analytics">
          <ClientPage component={ClientAnalytics} />
        </Route>
        <Route path="/client/apk">
          <ClientPage component={ClientApk} />
        </Route>

        {/* Root redirect */}
        <Route path="/">
          <Redirect to="/login" />
        </Route>

        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
