import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

// Admin
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminProjects from "@/pages/admin/Projects";
import AdminProjectDetail from "@/pages/admin/ProjectDetail";
import AdminEmployees from "@/pages/admin/Employees";
import AdminClients from "@/pages/admin/Clients";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminRequests from "@/pages/admin/Requests";

// Dev
import DevWorkspace from "@/pages/dev/Workspace";
import DevLogs from "@/pages/dev/Logs";
import DevBugs from "@/pages/dev/Bugs";
import DevApk from "@/pages/dev/Apk";
import DevReports from "@/pages/dev/Reports";
import DevRequests from "@/pages/dev/Requests";

// Client
import ClientPortal from "@/pages/client/Portal";
import ClientAnalytics from "@/pages/client/Analytics";
import ClientApk from "@/pages/client/Apk";

const queryClient = new QueryClient();

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
  );
}

function App() {
  return (
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
  );
}

export default App;
