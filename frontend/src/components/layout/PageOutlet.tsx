import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { RoleGate } from "./RoleGate";
import NotFound from "@/pages/not-found";

const AdminDashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const AdminScreenshots = React.lazy(() => import("@/pages/admin/Screenshots"));
const AdminAttendance = React.lazy(() => import("@/pages/admin/Attendance"));
const SettingsPage = React.lazy(() => import("@/pages/settings/SettingsPage"));
const AdminProjects = React.lazy(() => import("@/pages/admin/Projects"));
const AdminProjectDetail = React.lazy(() => import("@/pages/admin/ProjectDetail"));
const AdminEmployees = React.lazy(() => import("@/pages/admin/Employees"));
const AdminClients = React.lazy(() => import("@/pages/admin/Clients"));
const AdminTickets = React.lazy(() => import("@/pages/admin/Tickets"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin/Analytics"));
const AdminRequests = React.lazy(() => import("@/pages/admin/Requests"));
const DiscussionsPage = React.lazy(() => import("@/pages/admin/Discussions"));
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

const SalesDashboard = React.lazy(() => import("@/pages/sales/Dashboard"));
const SalesLeads = React.lazy(() => import("@/pages/sales/Leads"));
const SalesLeadDetail = React.lazy(() => import("@/pages/sales/LeadDetail"));
const SalesFollowUps = React.lazy(() => import("@/pages/sales/FollowUps"));
const SalesProposals = React.lazy(() => import("@/pages/sales/Proposals"));
const SalesProposalCreate = React.lazy(() => import("@/pages/sales/ProposalCreate"));
const SalesProposalDetail = React.lazy(() => import("@/pages/sales/ProposalDetail"));
const SalesCustomers = React.lazy(() => import("@/pages/sales/Customers"));
const SalesCustomerDetail = React.lazy(() => import("@/pages/sales/CustomerDetail"));
const SalesTeam = React.lazy(() => import("@/pages/sales/Team"));
const SalesReports = React.lazy(() => import("@/pages/sales/Reports"));
const SalesProducts = React.lazy(() => import("@/pages/sales/Products"));
const SalesInvoices = React.lazy(() => import("@/pages/sales/Invoices"));
const SalesInvoiceDetail = React.lazy(() => import("@/pages/sales/InvoiceDetail"));
const SalesPayments = React.lazy(() => import("@/pages/sales/Payments"));
const SalesInstallments = React.lazy(() => import("@/pages/sales/Installments"));
const SalesInstallmentDetail = React.lazy(() => import("@/pages/sales/InstallmentDetail"));
const SalesReceiptDetail = React.lazy(() => import("@/pages/sales/ReceiptDetail"));
const SalesSettings = React.lazy(() => import("@/pages/sales/Settings"));
const SalesNotifications = React.lazy(() => import("@/pages/sales/SalesNotifications"));

const FinanceDashboard = React.lazy(() => import("@/pages/finance/Dashboard"));
const FinanceExpenses = React.lazy(() => import("@/pages/finance/Expenses"));
const FinanceIncome = React.lazy(() => import("@/pages/finance/Income"));
const FinanceInvoices = React.lazy(() => import("@/pages/finance/Invoices"));
const FinanceInvoiceDetail = React.lazy(() => import("@/pages/finance/InvoiceDetail"));
const FinancePayroll = React.lazy(() => import("@/pages/finance/Payroll"));
const FinanceBudgets = React.lazy(() => import("@/pages/finance/Budgets"));
const FinanceLedgers = React.lazy(() => import("@/pages/finance/Ledgers"));
const FinancePayments = React.lazy(() => import("@/pages/finance/Payments"));
const FinanceTax = React.lazy(() => import("@/pages/finance/Tax"));
const FinanceReportsPnl = React.lazy(() => import("@/pages/finance/ReportsPnl"));

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
      <Route path="/admin/screenshots">
        <RoleGate allowedRoles={["super_admin"]}>
          <React.Suspense fallback={null}>
            <AdminScreenshots />
          </React.Suspense>
        </RoleGate>
      </Route>
      <Route path="/admin/attendance">
        <RoleGate allowedRoles={["super_admin"]}>
          <React.Suspense fallback={null}>
            <AdminAttendance />
          </React.Suspense>
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
        <Redirect to="/discussions" />
      </Route>
      <Route path="/discussions">
        <RoleGate allowedRoles={["super_admin", "developer", "tester", "qa", "client"]}>
          <DiscussionsPage />
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

      <Route path="/sales/leads/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesLeadDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals/create">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesProposalCreate />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesProposalDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/receipts/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesReceiptDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/installments/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesInstallmentDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/invoices/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesInvoiceDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/customers/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesCustomerDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/leads">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesLeads />
        </RoleGate>
      </Route>
      <Route path="/sales/follow-ups">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesFollowUps />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesProposals />
        </RoleGate>
      </Route>
      <Route path="/sales/installments">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesInstallments />
        </RoleGate>
      </Route>
      <Route path="/sales/invoices">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesInvoices />
        </RoleGate>
      </Route>
      <Route path="/sales/payments">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesPayments />
        </RoleGate>
      </Route>
      <Route path="/sales/customers">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesCustomers />
        </RoleGate>
      </Route>
      <Route path="/sales/products">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesProducts />
        </RoleGate>
      </Route>
      <Route path="/sales/team">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesTeam />
        </RoleGate>
      </Route>
      <Route path="/sales/reports">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesReports />
        </RoleGate>
      </Route>
      <Route path="/sales/settings">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesSettings />
        </RoleGate>
      </Route>
      <Route path="/sales/notifications">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesNotifications />
        </RoleGate>
      </Route>
      <Route path="/sales">
        <RoleGate allowedRoles={["super_admin"]}>
          <SalesDashboard />
        </RoleGate>
      </Route>

      <Route path="/finance/invoices/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceInvoiceDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/expenses">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceExpenses />
        </RoleGate>
      </Route>
      <Route path="/finance/income">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceIncome />
        </RoleGate>
      </Route>
      <Route path="/finance/invoices">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceInvoices />
        </RoleGate>
      </Route>
      <Route path="/finance/payroll">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinancePayroll />
        </RoleGate>
      </Route>
      <Route path="/finance/budgets">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceBudgets />
        </RoleGate>
      </Route>
      <Route path="/finance/ledgers">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceLedgers />
        </RoleGate>
      </Route>
      <Route path="/finance/payments">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinancePayments />
        </RoleGate>
      </Route>
      <Route path="/finance/tax">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceTax />
        </RoleGate>
      </Route>
      <Route path="/finance/reports/pnl">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceReportsPnl />
        </RoleGate>
      </Route>
      <Route path="/finance">
        <RoleGate allowedRoles={["super_admin"]}>
          <FinanceDashboard />
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
