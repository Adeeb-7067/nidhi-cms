import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { RoleGate } from "./RoleGate";
import NotFound from "@/pages/not-found";

const AdminDashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const SettingsPage = React.lazy(() => import("@/pages/settings/SettingsPage"));
const AdminProjects = React.lazy(() => import("@/pages/admin/Projects"));
const AdminProjectDetail = React.lazy(() => import("@/pages/admin/ProjectDetail"));
const AdminEmployees = React.lazy(() => import("@/pages/admin/Employees"));
const AdminClients = React.lazy(() => import("@/pages/admin/Clients"));
const AdminTickets = React.lazy(() => import("@/pages/admin/Tickets"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin/Analytics"));
const AdminRequests = React.lazy(() => import("@/pages/admin/Requests"));
const AdminDiscussions = React.lazy(() => import("@/pages/admin/Discussions"));
const DevWorkspace = React.lazy(() => import("@/pages/dev/Workspace"));
const DevProjects = React.lazy(() => import("@/pages/dev/Projects"));
const DevLogs = React.lazy(() => import("@/pages/dev/Logs"));
const DevBugs = React.lazy(() => import("@/pages/dev/Bugs"));
const DevTasks = React.lazy(() => import("@/pages/dev/Tasks"));
const TaskDetail = React.lazy(() => import("@/pages/dev/TaskDetail"));
const DevApk = React.lazy(() => import("@/pages/dev/Apk"));
const DevReports = React.lazy(() => import("@/pages/dev/Reports"));
const DevRequests = React.lazy(() => import("@/pages/dev/Requests"));
const ClientPortal = React.lazy(() => import("@/pages/client/Portal"));
const ClientAnalytics = React.lazy(() => import("@/pages/client/Analytics"));
const ClientApk = React.lazy(() => import("@/pages/client/Apk"));
const ProfilePage = React.lazy(() => import("@/pages/profile/ProfilePage"));
const NotificationsPage = React.lazy(() => import("@/pages/Notifications"));

/** Inner route switch — rendered inside persistent AppLayout (no layout remount on navigate). */
export function PageOutlet() {
  return (
    <Switch>
      <Route path="/admin/settings">
        <Redirect to="/settings" />
      </Route>

      <Route path="/admin">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminDashboard />
        </RoleGate>
      </Route>
      <Route path="/admin/projects/:id">
        <RoleGate allowedRoles={["super_admin", "developer", "tester", "qa"]}>
          <AdminProjectDetail />
        </RoleGate>
      </Route>
      <Route path="/admin/projects">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminProjects />
        </RoleGate>
      </Route>
      <Route path="/admin/employees">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminEmployees />
        </RoleGate>
      </Route>
      <Route path="/admin/clients">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminClients />
        </RoleGate>
      </Route>
      <Route path="/admin/tickets">
        <RoleGate allowedRoles={["super_admin", "developer", "tester", "qa", "client"]}>
          <AdminTickets />
        </RoleGate>
      </Route>
      <Route path="/admin/discussions">
        <RoleGate allowedRoles={["super_admin", "developer", "tester", "qa", "client"]}>
          <AdminDiscussions />
        </RoleGate>
      </Route>
      <Route path="/admin/analytics">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminAnalytics />
        </RoleGate>
      </Route>
      <Route path="/admin/requests">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminRequests />
        </RoleGate>
      </Route>

      <Route path="/settings">
        <RoleGate allowedRoles={["super_admin", "developer", "tester", "qa", "client"]}>
          <SettingsPage />
        </RoleGate>
      </Route>

      <Route path="/dev">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevWorkspace />
        </RoleGate>
      </Route>
      <Route path="/dev/projects">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevProjects />
        </RoleGate>
      </Route>
      <Route path="/dev/logs">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevLogs />
        </RoleGate>
      </Route>
      <Route path="/dev/tasks/:id">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <TaskDetail />
        </RoleGate>
      </Route>
      <Route path="/dev/tasks">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevTasks />
        </RoleGate>
      </Route>
      <Route path="/dev/bugs">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevBugs />
        </RoleGate>
      </Route>
      <Route path="/dev/apk">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevApk />
        </RoleGate>
      </Route>
      <Route path="/dev/reports">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevReports />
        </RoleGate>
      </Route>
      <Route path="/dev/requests">
        <RoleGate allowedRoles={["developer", "tester", "qa", "super_admin"]}>
          <DevRequests />
        </RoleGate>
      </Route>

      <Route path="/client">
        <RoleGate allowedRoles={["client"]}>
          <ClientPortal />
        </RoleGate>
      </Route>
      <Route path="/client/analytics">
        <RoleGate allowedRoles={["client"]}>
          <ClientAnalytics />
        </RoleGate>
      </Route>
      <Route path="/client/apk">
        <RoleGate allowedRoles={["client"]}>
          <ClientApk />
        </RoleGate>
      </Route>

      <Route path="/profile">
        <RoleGate allowedRoles={["super_admin", "developer", "client", "tester", "qa"]}>
          <ProfilePage />
        </RoleGate>
      </Route>
      <Route path="/notifications">
        <RoleGate allowedRoles={["super_admin", "developer", "client", "tester", "qa"]}>
          <NotificationsPage />
        </RoleGate>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}
