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

// Client
import ClientPortal from "@/pages/client/Portal";
import ClientAnalytics from "@/pages/client/Analytics";
import ClientApk from "@/pages/client/Apk";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      
      {/* Super Admin Routes */}
      <Route path="/admin*">
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <AppLayout>
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/projects" component={AdminProjects} />
              <Route path="/admin/projects/:id" component={AdminProjectDetail} />
              <Route path="/admin/employees" component={AdminEmployees} />
              <Route path="/admin/clients" component={AdminClients} />
              <Route path="/admin/analytics" component={AdminAnalytics} />
              <Route path="/admin/requests" component={AdminRequests} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Developer Routes */}
      <Route path="/dev*">
        <ProtectedRoute allowedRoles={["developer"]}>
          <AppLayout>
            <Switch>
              <Route path="/dev" component={DevWorkspace} />
              <Route path="/dev/logs" component={DevLogs} />
              <Route path="/dev/bugs" component={DevBugs} />
              <Route path="/dev/apk" component={DevApk} />
              <Route path="/dev/reports" component={DevReports} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Client Routes */}
      <Route path="/client*">
        <ProtectedRoute allowedRoles={["client"]}>
          <AppLayout>
            <Switch>
              <Route path="/client" component={ClientPortal} />
              <Route path="/client/analytics" component={ClientAnalytics} />
              <Route path="/client/apk" component={ClientApk} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
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
