import React from "react";
import { Switch, Route, Redirect, useRoute } from "wouter";
import { RoleGate } from "./RoleGate";
import { DEV_PORTAL_STAFF_ROLES, HRM_ADMIN_ROLES, HRM_EMPLOYEE_ROLES, INTERNAL_STAFF_ROLES, MONITORABLE_STAFF_ROLES, SALES_STAFF_ROLES } from "@/lib/user-roles";
import { CA_ACCESS_ROLES } from "@/modules/ca/constants";
import NotFound from "@/pages/not-found";

function SalesTeamProfileRedirect() {
  const [, params] = useRoute("/sales/team/:id/profile");
  const id = params?.id;
  if (!id) return <Redirect to="/sales/team" replace />;
  return <Redirect to={`/admin/employees/${id}`} replace />;
}

const AdminDashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const AdminScreenshots = React.lazy(() => import("@/pages/admin/Screenshots"));
const AdminAttendance = React.lazy(() => import("@/pages/admin/Attendance"));
const WorkAnalytics = React.lazy(() => import("@/pages/admin/WorkAnalytics"));
const SettingsPage = React.lazy(() => import("@/pages/settings/SettingsPage"));
const AdminProjects = React.lazy(() => import("@/pages/admin/Projects"));
const AdminProjectDetail = React.lazy(() => import("@/pages/admin/ProjectDetail"));
const AdminEmployees = React.lazy(() => import("@/pages/admin/Employees"));
const AdminRolesPermissions = React.lazy(() => import("@/pages/admin/RolesPermissions"));
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
const DevMyScreenshots = React.lazy(() => import("@/pages/dev/MyScreenshots"));
const ClientPortal = React.lazy(() => import("@/pages/client/Portal"));
const ClientAnalytics = React.lazy(() => import("@/pages/client/Analytics"));
const ClientApk = React.lazy(() => import("@/pages/client/Apk"));
const ClientTeam = React.lazy(() => import("@/pages/client/Team"));
const ClientTeamActivity = React.lazy(() => import("@/pages/client/TeamActivity"));
const ProfilePage = React.lazy(() => import("@/pages/profile/ProfilePage"));
const NotificationsPage = React.lazy(() => import("@/pages/Notifications"));

const SalesDashboard = React.lazy(() => import("@/pages/sales/Dashboard"));
const BdeDashboard = React.lazy(() => import("@/pages/sales/BdeDashboard"));
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

const LegalDashboard = React.lazy(() => import("@/pages/legal/Dashboard"));
const LegalCases = React.lazy(() => import("@/pages/legal/Cases"));
const LegalCaseDetail = React.lazy(() => import("@/pages/legal/CaseDetail"));
const LegalVendorDisputes = React.lazy(() => import("@/pages/legal/VendorDisputes"));
const LegalClientMatters = React.lazy(() => import("@/pages/legal/ClientMatters"));
const LegalNda = React.lazy(() => import("@/pages/legal/Nda"));
const LegalAgreements = React.lazy(() => import("@/pages/legal/Agreements"));
const LegalNotices = React.lazy(() => import("@/pages/legal/Notices"));
const LegalCourtCases = React.lazy(() => import("@/pages/legal/CourtCases"));
const LegalCompliance = React.lazy(() => import("@/pages/legal/Compliance"));
const LegalExpenses = React.lazy(() => import("@/pages/legal/Expenses"));

const CaDashboard = React.lazy(() => import("@/pages/ca/Dashboard"));
const CaClientPayments = React.lazy(() => import("@/pages/ca/ClientPayments"));
const CaVendors = React.lazy(() => import("@/pages/ca/Vendors"));
const CaExpenses = React.lazy(() => import("@/pages/ca/Expenses"));
const CaBankReconciliation = React.lazy(() => import("@/pages/ca/BankReconciliation"));
const CaSuspense = React.lazy(() => import("@/pages/ca/Suspense"));
const CaGst = React.lazy(() => import("@/pages/ca/Gst"));
const CaTds = React.lazy(() => import("@/pages/ca/Tds"));
const CaCompanyItr = React.lazy(() => import("@/pages/ca/CompanyItr"));
const CaDirectorItr = React.lazy(() => import("@/pages/ca/DirectorItr"));
const CaRoc = React.lazy(() => import("@/pages/ca/Roc"));
const CaDinDsc = React.lazy(() => import("@/pages/ca/DinDsc"));
const CaDocuments = React.lazy(() => import("@/pages/ca/Documents"));
const CaAudit = React.lazy(() => import("@/pages/ca/Audit"));
const CaNotices = React.lazy(() => import("@/pages/ca/Notices"));
const CaComplianceCalendar = React.lazy(() => import("@/pages/ca/ComplianceCalendar"));
const CaTasks = React.lazy(() => import("@/pages/ca/Tasks"));
const CaComplianceScore = React.lazy(() => import("@/pages/ca/ComplianceScore"));

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

const HrmDashboard = React.lazy(() => import("@/pages/hrm/Dashboard"));
const HrmDepartments = React.lazy(() => import("@/pages/hrm/Departments"));
const HrmEmployees = React.lazy(() => import("@/pages/hrm/Employees"));
const HrmEmployeeDetail = React.lazy(() => import("@/pages/hrm/EmployeeDetail"));
const HrmLeave = React.lazy(() => import("@/pages/hrm/Leave"));
const HrmWfh = React.lazy(() => import("@/pages/hrm/Wfh"));
const HrmShifts = React.lazy(() => import("@/pages/hrm/Shifts"));
const HrmCalendar = React.lazy(() => import("@/pages/hrm/Calendar"));
const HrmHolidays = React.lazy(() => import("@/pages/hrm/Holidays"));
const HrmAttendance = React.lazy(() => import("@/pages/hrm/Attendance"));
const HrmPayroll = React.lazy(() => import("@/pages/hrm/Payroll"));
const HrmMyAttendance = React.lazy(() => import("@/pages/hrm/MyAttendance"));
const HrmMyLeave = React.lazy(() => import("@/pages/hrm/MyLeave"));
const HrmMyWfh = React.lazy(() => import("@/pages/hrm/MyWfh"));
const HrmMyPayslips = React.lazy(() => import("@/pages/hrm/MyPayslips"));
const HrmSalarySlips = React.lazy(() => import("@/pages/hrm/SalarySlips"));
const HrmMyHolidays = React.lazy(() => import("@/pages/hrm/MyHolidays"));
const HrmSettings = React.lazy(() => import("@/pages/hrm/Settings"));
const HrmRecruitment = React.lazy(() => import("@/pages/hrm/Recruitment"));
const HrmDocuments = React.lazy(() => import("@/pages/hrm/Documents"));
const HrmPolicies = React.lazy(() => import("@/pages/hrm/Policies"));
const HrmAudit = React.lazy(() => import("@/pages/hrm/Audit"));
const HrmOnboarding = React.lazy(() => import("@/pages/hrm/Onboarding"));
const HrmRoles = React.lazy(() => import("@/pages/hrm/Roles"));
const HrmAssets = React.lazy(() => import("@/pages/hrm/Assets"));
const HrmExit = React.lazy(() => import("@/pages/hrm/Exit"));
const HrmIdCards = React.lazy(() => import("@/pages/hrm/IdCards"));

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
        <RoleGate allowedRoles={["super_admin", ...DEV_PORTAL_STAFF_ROLES]}>
          <AdminProjectDetail />
        </RoleGate>
      </Route>
      <Route path="/admin/projects">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminProjects />
        </RoleGate>
      </Route>
      <Route path="/admin/employees/:id">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <HrmEmployeeDetail />
        </RoleGate>
      </Route>
      <Route path="/admin/employees">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminEmployees />
        </RoleGate>
      </Route>
      <Route path="/admin/roles">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminRolesPermissions />
        </RoleGate>
      </Route>
      <Route path="/hrm/roles">
        <RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}>
          <HrmRoles />
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
      <Route path="/admin/monitoring/analytics">
        <RoleGate module="monitor_attendance">
          <React.Suspense fallback={null}>
            <WorkAnalytics />
          </React.Suspense>
        </RoleGate>
      </Route>
      <Route path="/admin/clients">
        <RoleGate allowedRoles={["super_admin"]}>
          <AdminClients />
        </RoleGate>
      </Route>
      <Route path="/admin/tickets">
        <RoleGate allowedRoles={["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"]}>
          <AdminTickets />
        </RoleGate>
      </Route>
      <Route path="/admin/discussions">
        <Redirect to="/discussions" />
      </Route>
      <Route path="/discussions">
        <RoleGate allowedRoles={["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"]}>
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
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesLeadDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals/create">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesProposalCreate />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals/:id">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesProposalDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/receipts/:id">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesReceiptDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/installments/:id">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesInstallmentDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/invoices/:id">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesInvoiceDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/customers/:id">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesCustomerDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/leads">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesLeads />
        </RoleGate>
      </Route>
      <Route path="/sales/follow-ups">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesFollowUps />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesProposals />
        </RoleGate>
      </Route>
      <Route path="/sales/installments">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesInstallments />
        </RoleGate>
      </Route>
      <Route path="/sales/invoices">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesInvoices />
        </RoleGate>
      </Route>
      <Route path="/sales/payments">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesPayments />
        </RoleGate>
      </Route>
      <Route path="/sales/customers">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesCustomers />
        </RoleGate>
      </Route>
      <Route path="/sales/products">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesProducts />
        </RoleGate>
      </Route>
      <Route path="/sales/team/:id/profile">
        <SalesTeamProfileRedirect />
      </Route>
      <Route path="/sales/team">
        <RoleGate allowedRoles={[...SALES_STAFF_ROLES, "hr"]}>
          <SalesTeam />
        </RoleGate>
      </Route>
      <Route path="/sales/reports">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesReports />
        </RoleGate>
      </Route>
      <Route path="/sales/settings">
        <RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}>
          <SalesSettings />
        </RoleGate>
      </Route>
      <Route path="/sales/notifications">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesNotifications />
        </RoleGate>
      </Route>
      <Route path="/sales/bde">
        <RoleGate allowedRoles={["bde"]}>
          <BdeDashboard />
        </RoleGate>
      </Route>
      <Route path="/sales">
        <RoleGate allowedRoles={INTERNAL_STAFF_ROLES}>
          <SalesDashboard />
        </RoleGate>
      </Route>

      <Route path="/legal/cases/:id">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalCaseDetail />
        </RoleGate>
      </Route>
      <Route path="/legal/cases">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalCases />
        </RoleGate>
      </Route>
      <Route path="/legal/vendor-disputes">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalVendorDisputes />
        </RoleGate>
      </Route>
      <Route path="/legal/client-matters">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalClientMatters />
        </RoleGate>
      </Route>
      <Route path="/legal/nda">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalNda />
        </RoleGate>
      </Route>
      <Route path="/legal/agreements">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalAgreements />
        </RoleGate>
      </Route>
      <Route path="/legal/notices">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalNotices />
        </RoleGate>
      </Route>
      <Route path="/legal/court-cases">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalCourtCases />
        </RoleGate>
      </Route>
      <Route path="/legal/compliance">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalCompliance />
        </RoleGate>
      </Route>
      <Route path="/legal/expenses">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalExpenses />
        </RoleGate>
      </Route>
      <Route path="/legal">
        <RoleGate allowedRoles={["super_admin"]}>
          <LegalDashboard />
        </RoleGate>
      </Route>

      <Route path="/ca/client-payments">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaClientPayments />
        </RoleGate>
      </Route>
      <Route path="/ca/vendors">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaVendors />
        </RoleGate>
      </Route>
      <Route path="/ca/expenses">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaExpenses />
        </RoleGate>
      </Route>
      <Route path="/ca/bank-reconciliation">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaBankReconciliation />
        </RoleGate>
      </Route>
      <Route path="/ca/suspense">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaSuspense />
        </RoleGate>
      </Route>
      <Route path="/ca/gst">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaGst />
        </RoleGate>
      </Route>
      <Route path="/ca/tds">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaTds />
        </RoleGate>
      </Route>
      <Route path="/ca/company-itr">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaCompanyItr />
        </RoleGate>
      </Route>
      <Route path="/ca/director-itr">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaDirectorItr />
        </RoleGate>
      </Route>
      <Route path="/ca/roc">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaRoc />
        </RoleGate>
      </Route>
      <Route path="/ca/din-dsc">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaDinDsc />
        </RoleGate>
      </Route>
      <Route path="/ca/documents">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaDocuments />
        </RoleGate>
      </Route>
      <Route path="/ca/audit">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaAudit />
        </RoleGate>
      </Route>
      <Route path="/ca/notices">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaNotices />
        </RoleGate>
      </Route>
      <Route path="/ca/compliance-calendar">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaComplianceCalendar />
        </RoleGate>
      </Route>
      <Route path="/ca/tasks">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaTasks />
        </RoleGate>
      </Route>
      <Route path="/ca/compliance-score">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaComplianceScore />
        </RoleGate>
      </Route>
      <Route path="/ca">
        <RoleGate allowedRoles={CA_ACCESS_ROLES}>
          <CaDashboard />
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

      <Route path="/settings/:section">
        <RoleGate allowedRoles={["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"]}>
          <SettingsPage />
        </RoleGate>
      </Route>
      <Route path="/settings">
        <RoleGate allowedRoles={["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"]}>
          <SettingsPage />
        </RoleGate>
      </Route>

      <Route path="/dev">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevWorkspace />
        </RoleGate>
      </Route>
      <Route path="/dev/projects/:id">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <AdminProjectDetail />
        </RoleGate>
      </Route>
      <Route path="/dev/projects">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevProjects />
        </RoleGate>
      </Route>
      <Route path="/dev/logs">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevLogs />
        </RoleGate>
      </Route>
      <Route path="/dev/tasks/:id">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <TaskDetail />
        </RoleGate>
      </Route>
      <Route path="/dev/tasks">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevTasks />
        </RoleGate>
      </Route>
      <Route path="/dev/bugs">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevBugs />
        </RoleGate>
      </Route>
      <Route path="/dev/apk">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevApk />
        </RoleGate>
      </Route>
      <Route path="/dev/reports">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevReports />
        </RoleGate>
      </Route>
      <Route path="/dev/requests">
        <RoleGate allowedRoles={[...DEV_PORTAL_STAFF_ROLES, "super_admin"]}>
          <DevRequests />
        </RoleGate>
      </Route>
      <Route path="/dev/my-screenshots">
        <RoleGate allowedRoles={[...MONITORABLE_STAFF_ROLES]}>
          <React.Suspense fallback={null}>
            <DevMyScreenshots />
          </React.Suspense>
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
      <Route path="/client/team/activity">
        <RoleGate allowedRoles={["client"]}>
          <ClientTeamActivity />
        </RoleGate>
      </Route>
      <Route path="/client/team">
        <RoleGate allowedRoles={["client"]}>
          <ClientTeam />
        </RoleGate>
      </Route>

      <Route path="/profile">
        <RoleGate allowedRoles={["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"]}>
          <ProfilePage />
        </RoleGate>
      </Route>
      <Route path="/notifications">
        <RoleGate allowedRoles={["super_admin", "hr", "bde", ...DEV_PORTAL_STAFF_ROLES, "client"]}>
          <NotificationsPage />
        </RoleGate>
      </Route>

      <Route path="/hrm/departments"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmDepartments /></RoleGate></Route>
      <Route path="/hrm/employees/:id"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES, "manager"]}><HrmEmployeeDetail /></RoleGate></Route>
      <Route path="/hrm/employees"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES, "manager"]}><HrmEmployees /></RoleGate></Route>
      <Route path="/hrm/leave"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES, "manager", ...HRM_EMPLOYEE_ROLES]}><HrmLeave /></RoleGate></Route>
      <Route path="/hrm/wfh"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES, "manager", ...HRM_EMPLOYEE_ROLES]}><HrmWfh /></RoleGate></Route>
      <Route path="/hrm/shifts"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmShifts /></RoleGate></Route>
      <Route path="/hrm/calendar"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmCalendar /></RoleGate></Route>
      <Route path="/hrm/holidays"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmHolidays /></RoleGate></Route>
      <Route path="/hrm/attendance"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES, "manager", ...HRM_EMPLOYEE_ROLES]}><HrmAttendance /></RoleGate></Route>
      <Route path="/hrm/payroll"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmPayroll /></RoleGate></Route>
      <Route path="/hrm/salary-slips"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmSalarySlips /></RoleGate></Route>
      <Route path="/hrm/my-attendance"><RoleGate allowedRoles={[...HRM_EMPLOYEE_ROLES]}><HrmMyAttendance /></RoleGate></Route>
      <Route path="/hrm/my-leave"><RoleGate allowedRoles={[...HRM_EMPLOYEE_ROLES]}><HrmMyLeave /></RoleGate></Route>
      <Route path="/hrm/my-wfh"><RoleGate allowedRoles={[...HRM_EMPLOYEE_ROLES]}><HrmMyWfh /></RoleGate></Route>
      <Route path="/hrm/my-payslips"><RoleGate allowedRoles={[...HRM_EMPLOYEE_ROLES]}><HrmMyPayslips /></RoleGate></Route>
      <Route path="/hrm/my-holidays"><RoleGate allowedRoles={[...HRM_EMPLOYEE_ROLES]}><HrmMyHolidays /></RoleGate></Route>
      <Route path="/hrm/settings"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmSettings /></RoleGate></Route>
      <Route path="/hrm/recruitment"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmRecruitment /></RoleGate></Route>
      <Route path="/hrm/onboarding"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmOnboarding /></RoleGate></Route>
      <Route path="/hrm/documents"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmDocuments /></RoleGate></Route>
      <Route path="/hrm/policies"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmPolicies /></RoleGate></Route>
      <Route path="/hrm/assets"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmAssets /></RoleGate></Route>
      <Route path="/hrm/exit"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmExit /></RoleGate></Route>
      <Route path="/hrm/id-cards"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmIdCards /></RoleGate></Route>
      <Route path="/hrm/audit"><RoleGate allowedRoles={[...HRM_ADMIN_ROLES]}><HrmAudit /></RoleGate></Route>
      <Route path="/hrm">
        <RoleGate allowedRoles={[...HRM_ADMIN_ROLES, ...HRM_EMPLOYEE_ROLES]}>
          <HrmDashboard />
        </RoleGate>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}
