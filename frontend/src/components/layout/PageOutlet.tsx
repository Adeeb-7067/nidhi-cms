import React from "react";
import { Switch, Route, Redirect, useRoute } from "wouter";
import { RoleGate } from "./RoleGate";
import { PROFILE_PAGE_ROLES } from "@/lib/user-roles";
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
const AdminProjectDocuments = React.lazy(() => import("@/pages/admin/ProjectDocuments"));
const AdminMedia = React.lazy(() => import("@/pages/admin/Media"));
const AdminProjectDetail = React.lazy(() => import("@/pages/admin/ProjectDetail"));
const AdminEmployees = React.lazy(() => import("@/pages/admin/Employees"));
const AdminRolesPermissions = React.lazy(() => import("@/pages/admin/RolesPermissions"));
const AdminClients = React.lazy(() => import("@/pages/admin/Clients"));
const AdminTickets = React.lazy(() => import("@/pages/admin/Tickets"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin/Analytics"));
const AdminActivity = React.lazy(() => import("@/pages/admin/Activity"));
const AdminRequests = React.lazy(() => import("@/pages/admin/Requests"));
const AdminAlerts = React.lazy(() => import("@/pages/admin/Alerts"));
const DiscussionsPage = React.lazy(() => import("@/pages/admin/Discussions"));
const DevHome = React.lazy(() => import("@/pages/dev/DevHome"));
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
const BdeProjects = React.lazy(() => import("@/pages/sales/BdeProjects"));
const SalesLeads = React.lazy(() => import("@/pages/sales/Leads"));
const SalesLeadDetail = React.lazy(() => import("@/pages/sales/LeadDetail"));
const SalesFollowUps = React.lazy(() => import("@/pages/sales/FollowUps"));
const SalesProposals = React.lazy(() => import("@/pages/sales/Proposals"));
const SalesProposalCreate = React.lazy(() => import("@/pages/sales/ProposalCreate"));
const SalesProposalDetail = React.lazy(() => import("@/pages/sales/ProposalDetail"));
const SalesCustomers = React.lazy(() => import("@/pages/sales/Customers"));
const SalesClientTeam = React.lazy(() => import("@/pages/sales/ClientTeam"));
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
const LegalCounsel = React.lazy(() => import("@/pages/legal/Counsel"));
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
const FinanceLoans = React.lazy(() => import("@/pages/finance/Loans"));
const FinanceLoanDetail = React.lazy(() => import("@/pages/finance/LoanDetail"));
const FinanceCheques = React.lazy(() => import("@/pages/finance/Cheques"));
const FinanceChequeDetail = React.lazy(() => import("@/pages/finance/ChequeDetail"));
const FinanceSubscriptions = React.lazy(() => import("@/pages/finance/Subscriptions"));
const FinanceSubscriptionDetail = React.lazy(() => import("@/pages/finance/SubscriptionDetail"));
const FinanceLedgers = React.lazy(() => import("@/pages/finance/Ledgers"));
const FinancePayments = React.lazy(() => import("@/pages/finance/Payments"));
const FinanceVendors = React.lazy(() => import("@/pages/finance/Vendors"));
const FinanceVendorDetail = React.lazy(() => import("@/pages/finance/VendorDetail"));
const FinanceVendorAnalytics = React.lazy(() => import("@/pages/finance/VendorAnalytics"));
const FinanceTax = React.lazy(() => import("@/pages/finance/Tax"));
const FinanceReportsPnl = React.lazy(() => import("@/pages/finance/ReportsPnl"));
const FinanceNotifications = React.lazy(() => import("@/pages/finance/Notifications"));
const FinancePaymentDetail = React.lazy(() => import("@/pages/finance/PaymentDetail"));
const FinanceFreelancerDashboard = React.lazy(() => import("@/pages/finance/FreelancerDashboardPage"));
const FinanceFreelancerDirectory = React.lazy(() => import("@/pages/finance/FreelancerDirectoryPage"));
const FinanceFreelancerEngagements = React.lazy(() => import("@/pages/finance/FreelancerEngagements"));
const FinanceFreelancerReceipts = React.lazy(() => import("@/pages/finance/FreelancerReceiptsPage"));
const FinanceFreelancerReceiptDetail = React.lazy(
  () => import("@/pages/finance/FreelancerReceiptDetail"),
);

const MyFreelancerPayments = React.lazy(() => import("@/pages/dev/MyFreelancerPayments"));
const FreelancerDashboard = React.lazy(() => import("@/pages/freelancer/Dashboard"));


const MarketingDashboard = React.lazy(() => import("@/pages/marketing/Dashboard"));
const MarketingTasks = React.lazy(() => import("@/pages/marketing/Tasks"));
const MarketingProjects = React.lazy(() => import("@/pages/marketing/Projects"));
const MarketingProjectDetail = React.lazy(() => import("@/pages/marketing/ProjectDetail"));
const MarketingCalendar = React.lazy(() => import("@/pages/marketing/Calendar"));
const MarketingGraphics = React.lazy(() => import("@/pages/marketing/Graphics"));
const MarketingVideos = React.lazy(() => import("@/pages/marketing/Videos"));
const MarketingSocial = React.lazy(() => import("@/pages/marketing/Social"));
const MarketingMetaAds = React.lazy(() => import("@/pages/marketing/MetaAds"));
const MarketingGoogleAds = React.lazy(() => import("@/pages/marketing/GoogleAds"));
const MarketingSeo = React.lazy(() => import("@/pages/marketing/Seo"));
const MarketingContent = React.lazy(() => import("@/pages/marketing/Content"));
const MarketingApprovals = React.lazy(() => import("@/pages/marketing/Approvals"));
const MarketingPerformance = React.lazy(() => import("@/pages/marketing/Performance"));
const MarketingTeam = React.lazy(() => import("@/pages/marketing/Team"));
const MarketingReports = React.lazy(() => import("@/pages/marketing/Reports"));
const MarketingMedia = React.lazy(() => import("@/pages/marketing/Media"));

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
const HrmManualPayslips = React.lazy(() => import("@/pages/hrm/ManualPayslips"));
const HrmMyHolidays = React.lazy(() => import("@/pages/hrm/MyHolidays"));
const HrmSettings = React.lazy(() => import("@/pages/hrm/Settings"));
const HrmRecruitment = React.lazy(() => import("@/pages/hrm/Recruitment"));
const HrmDocuments = React.lazy(() => import("@/pages/hrm/Documents"));
const HrmPolicies = React.lazy(() => import("@/pages/hrm/Policies"));
const HrmHrKit = React.lazy(() => import("@/pages/hrm/HrKit"));

const HrmAudit = React.lazy(() => import("@/pages/hrm/Audit"));
const HrmOnboarding = React.lazy(() => import("@/pages/hrm/Onboarding"));
const HrmRoles = React.lazy(() => import("@/pages/hrm/Roles"));
const HrmAssets = React.lazy(() => import("@/pages/hrm/Assets"));
const HrmExit = React.lazy(() => import("@/pages/hrm/Exit"));
const HrmIdCards = React.lazy(() => import("@/pages/hrm/IdCards"));
const HrmExperienceLetters = React.lazy(() => import("@/pages/hrm/ExperienceLetters"));

/** Inner route switch — rendered inside persistent AppLayout (no layout remount on navigate). */
export function PageOutlet() {
  return (
    <Switch>
      <Route path="/admin/settings">
        <Redirect to="/settings" />
      </Route>

      <Route path="/admin">
        <RoleGate>
          <AdminDashboard />
        </RoleGate>
      </Route>
      <Route path="/admin/project-documents">
        <RoleGate>
          <AdminProjectDocuments />
        </RoleGate>
      </Route>
      <Route path="/admin/media">
        <RoleGate>
          <AdminMedia />
        </RoleGate>
      </Route>
      <Route path="/admin/projects/:id">
        <RoleGate>
          <AdminProjectDetail />
        </RoleGate>
      </Route>
      <Route path="/admin/projects">
        <RoleGate>
          <AdminProjects />
        </RoleGate>
      </Route>
      <Route path="/admin/employees/:id">
        <RoleGate>
          <HrmEmployeeDetail />
        </RoleGate>
      </Route>
      <Route path="/admin/employees">
        <RoleGate>
          <AdminEmployees />
        </RoleGate>
      </Route>
      <Route path="/admin/roles">
        <RoleGate>
          <AdminRolesPermissions />
        </RoleGate>
      </Route>
      <Route path="/hrm/roles">
        <RoleGate>
          <HrmRoles />
        </RoleGate>
      </Route>
      <Route path="/admin/screenshots">
        <RoleGate>
          <React.Suspense fallback={null}>
            <AdminScreenshots />
          </React.Suspense>
        </RoleGate>
      </Route>
      <Route path="/admin/attendance">
        <RoleGate>
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
        <RoleGate>
          <AdminClients />
        </RoleGate>
      </Route>
      <Route path="/admin/tickets">
        <RoleGate allowedRoles={PROFILE_PAGE_ROLES}>
          <AdminTickets />
        </RoleGate>
      </Route>
      <Route path="/admin/discussions">
        <Redirect to="/discussions" />
      </Route>
      <Route path="/discussions">
        <RoleGate allowedRoles={PROFILE_PAGE_ROLES}>
          <DiscussionsPage />
        </RoleGate>
      </Route>
      <Route path="/admin/analytics">
        <RoleGate>
          <AdminAnalytics />
        </RoleGate>
      </Route>
      <Route path="/admin/activity">
        <RoleGate>
          <AdminActivity />
        </RoleGate>
      </Route>
      <Route path="/admin/requests">
        <RoleGate>
          <AdminRequests />
        </RoleGate>
      </Route>
      <Route path="/admin/alerts">
        <RoleGate>
          <AdminAlerts />
        </RoleGate>
      </Route>

      <Route path="/sales/leads/:id">
        <RoleGate>
          <SalesLeadDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals/create">
        <RoleGate>
          <SalesProposalCreate />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals/:id">
        <RoleGate>
          <SalesProposalDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/receipts/:id">
        <RoleGate>
          <SalesReceiptDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/installments/:id">
        <RoleGate>
          <SalesInstallmentDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/invoices/:id">
        <RoleGate>
          <SalesInvoiceDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/customers/:id">
        <RoleGate>
          <SalesCustomerDetail />
        </RoleGate>
      </Route>
      <Route path="/sales/client-team">
        <RoleGate>
          <SalesClientTeam />
        </RoleGate>
      </Route>
      <Route path="/sales/leads">
        <RoleGate>
          <SalesLeads />
        </RoleGate>
      </Route>
      <Route path="/sales/follow-ups">
        <RoleGate>
          <SalesFollowUps />
        </RoleGate>
      </Route>
      <Route path="/sales/proposals">
        <RoleGate>
          <SalesProposals />
        </RoleGate>
      </Route>
      <Route path="/sales/installments">
        <RoleGate>
          <SalesInstallments />
        </RoleGate>
      </Route>
      <Route path="/sales/invoices">
        <RoleGate>
          <SalesInvoices />
        </RoleGate>
      </Route>
      <Route path="/sales/payments">
        <RoleGate>
          <SalesPayments />
        </RoleGate>
      </Route>
      <Route path="/sales/customers">
        <RoleGate>
          <SalesCustomers />
        </RoleGate>
      </Route>
      <Route path="/sales/products">
        <RoleGate>
          <SalesProducts />
        </RoleGate>
      </Route>
      <Route path="/sales/team/:id/profile">
        <SalesTeamProfileRedirect />
      </Route>
      <Route path="/sales/team">
        <RoleGate>
          <SalesTeam />
        </RoleGate>
      </Route>
      <Route path="/sales/reports">
        <RoleGate>
          <SalesReports />
        </RoleGate>
      </Route>
      <Route path="/sales/settings">
        <RoleGate>
          <SalesSettings />
        </RoleGate>
      </Route>
      <Route path="/sales/notifications">
        <RoleGate>
          <SalesNotifications />
        </RoleGate>
      </Route>
      <Route path="/sales/bde">
        <RoleGate>
          <BdeDashboard />
        </RoleGate>
      </Route>
      <Route path="/sales/bde/projects">
        <RoleGate>
          <BdeProjects />
        </RoleGate>
      </Route>
      <Route path="/sales">
        <RoleGate>
          <SalesDashboard />
        </RoleGate>
      </Route>

      <Route path="/legal/counsel">
        <RoleGate>
          <LegalCounsel />
        </RoleGate>
      </Route>
      <Route path="/legal/cases/:id">
        <RoleGate>
          <LegalCaseDetail />
        </RoleGate>
      </Route>
      <Route path="/legal/cases">
        <RoleGate>
          <LegalCases />
        </RoleGate>
      </Route>
      <Route path="/legal/vendor-disputes">
        <RoleGate>
          <LegalVendorDisputes />
        </RoleGate>
      </Route>
      <Route path="/legal/client-matters">
        <RoleGate>
          <LegalClientMatters />
        </RoleGate>
      </Route>
      <Route path="/legal/nda">
        <RoleGate>
          <LegalNda />
        </RoleGate>
      </Route>
      <Route path="/legal/agreements">
        <RoleGate>
          <LegalAgreements />
        </RoleGate>
      </Route>
      <Route path="/legal/notices">
        <RoleGate>
          <LegalNotices />
        </RoleGate>
      </Route>
      <Route path="/legal/court-cases">
        <RoleGate>
          <LegalCourtCases />
        </RoleGate>
      </Route>
      <Route path="/legal/compliance">
        <RoleGate>
          <LegalCompliance />
        </RoleGate>
      </Route>
      <Route path="/legal/expenses">
        <RoleGate>
          <LegalExpenses />
        </RoleGate>
      </Route>
      <Route path="/legal">
        <RoleGate>
          <LegalDashboard />
        </RoleGate>
      </Route>

      <Route path="/marketing/projects/:id">
        <RoleGate>
          <MarketingProjectDetail />
        </RoleGate>
      </Route>
      <Route path="/marketing/tasks">
        <RoleGate>
          <MarketingTasks />
        </RoleGate>
      </Route>
      <Route path="/marketing/projects">
        <RoleGate>
          <MarketingProjects />
        </RoleGate>
      </Route>
      <Route path="/marketing/media">
        <RoleGate>
          <MarketingMedia />
        </RoleGate>
      </Route>
      <Route path="/marketing/calendar">
        <RoleGate>
          <MarketingCalendar />
        </RoleGate>
      </Route>
      <Route path="/marketing/graphics">
        <RoleGate>
          <MarketingGraphics />
        </RoleGate>
      </Route>
      <Route path="/marketing/videos">
        <RoleGate>
          <MarketingVideos />
        </RoleGate>
      </Route>
      <Route path="/marketing/social">
        <RoleGate>
          <MarketingSocial />
        </RoleGate>
      </Route>
      <Route path="/marketing/meta-ads">
        <RoleGate>
          <MarketingMetaAds />
        </RoleGate>
      </Route>
      <Route path="/marketing/google-ads">
        <RoleGate>
          <MarketingGoogleAds />
        </RoleGate>
      </Route>
      <Route path="/marketing/seo">
        <RoleGate>
          <MarketingSeo />
        </RoleGate>
      </Route>
      <Route path="/marketing/content">
        <RoleGate>
          <MarketingContent />
        </RoleGate>
      </Route>
      <Route path="/marketing/approvals">
        <RoleGate>
          <MarketingApprovals />
        </RoleGate>
      </Route>
      <Route path="/marketing/performance">
        <RoleGate>
          <MarketingPerformance />
        </RoleGate>
      </Route>
      <Route path="/marketing/team">
        <RoleGate>
          <MarketingTeam />
        </RoleGate>
      </Route>
      <Route path="/marketing/reports">
        <RoleGate>
          <MarketingReports />
        </RoleGate>
      </Route>
      <Route path="/marketing">
        <RoleGate>
          <MarketingDashboard />
        </RoleGate>
      </Route>

      <Route path="/ca/client-payments">
        <RoleGate>
          <CaClientPayments />
        </RoleGate>
      </Route>
      <Route path="/ca/vendors">
        <RoleGate>
          <CaVendors />
        </RoleGate>
      </Route>
      <Route path="/ca/expenses">
        <RoleGate>
          <CaExpenses />
        </RoleGate>
      </Route>
      <Route path="/ca/bank-reconciliation">
        <RoleGate>
          <CaBankReconciliation />
        </RoleGate>
      </Route>
      <Route path="/ca/suspense">
        <RoleGate>
          <CaSuspense />
        </RoleGate>
      </Route>
      <Route path="/ca/gst">
        <RoleGate>
          <CaGst />
        </RoleGate>
      </Route>
      <Route path="/ca/tds">
        <RoleGate>
          <CaTds />
        </RoleGate>
      </Route>
      <Route path="/ca/company-itr">
        <RoleGate>
          <CaCompanyItr />
        </RoleGate>
      </Route>
      <Route path="/ca/director-itr">
        <RoleGate>
          <CaDirectorItr />
        </RoleGate>
      </Route>
      <Route path="/ca/roc">
        <RoleGate>
          <CaRoc />
        </RoleGate>
      </Route>
      <Route path="/ca/din-dsc">
        <RoleGate>
          <CaDinDsc />
        </RoleGate>
      </Route>
      <Route path="/ca/documents">
        <RoleGate>
          <CaDocuments />
        </RoleGate>
      </Route>
      <Route path="/ca/audit">
        <RoleGate>
          <CaAudit />
        </RoleGate>
      </Route>
      <Route path="/ca/notices">
        <RoleGate>
          <CaNotices />
        </RoleGate>
      </Route>
      <Route path="/ca/compliance-calendar">
        <RoleGate>
          <CaComplianceCalendar />
        </RoleGate>
      </Route>
      <Route path="/ca/tasks">
        <RoleGate>
          <CaTasks />
        </RoleGate>
      </Route>
      <Route path="/ca/compliance-score">
        <RoleGate>
          <CaComplianceScore />
        </RoleGate>
      </Route>
      <Route path="/ca">
        <RoleGate>
          <CaDashboard />
        </RoleGate>
      </Route>

      <Route path="/finance/invoices/:id">
        <RoleGate>
          <FinanceInvoiceDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/expenses">
        <RoleGate>
          <FinanceExpenses />
        </RoleGate>
      </Route>
      <Route path="/finance/income">
        <RoleGate>
          <FinanceIncome />
        </RoleGate>
      </Route>
      <Route path="/finance/invoices">
        <RoleGate>
          <FinanceInvoices />
        </RoleGate>
      </Route>
      <Route path="/finance/payroll">
        <RoleGate>
          <FinancePayroll />
        </RoleGate>
      </Route>
      <Route path="/finance/budgets">
        <RoleGate>
          <FinanceBudgets />
        </RoleGate>
      </Route>
      <Route path="/finance/loans/:id">
        <RoleGate>
          <FinanceLoanDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/loans">
        <RoleGate>
          <FinanceLoans />
        </RoleGate>
      </Route>
      <Route path="/finance/cheques/:id">
        <RoleGate>
          <FinanceChequeDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/cheques">
        <RoleGate>
          <FinanceCheques />
        </RoleGate>
      </Route>
      <Route path="/finance/subscriptions/:id">
        <RoleGate>
          <FinanceSubscriptionDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/subscriptions">
        <RoleGate>
          <FinanceSubscriptions />
        </RoleGate>
      </Route>
      <Route path="/freelancers/dashboard">
        <RoleGate>
          <FinanceFreelancerDashboard />
        </RoleGate>
      </Route>
      <Route path="/freelancers/directory">
        <RoleGate>
          <FinanceFreelancerDirectory />
        </RoleGate>
      </Route>
      <Route path="/freelancers/payments">
        <RoleGate>
          <FinanceFreelancerEngagements />
        </RoleGate>
      </Route>
      <Route path="/freelancers/receipts/:engagementId/:installmentId">
        <RoleGate>
          <FinanceFreelancerReceiptDetail />
        </RoleGate>
      </Route>
      <Route path="/freelancers/receipts">
        <RoleGate>
          <FinanceFreelancerReceipts />
        </RoleGate>
      </Route>
      <Route path="/finance/freelancers/receipts/:engagementId/:installmentId">
        <RoleGate>
          <FinanceFreelancerReceiptDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/freelancers/receipts">
        <RoleGate>
          <FinanceFreelancerReceipts />
        </RoleGate>
      </Route>
      <Route path="/finance/freelancers/dashboard">
        <RoleGate>
          <FinanceFreelancerDashboard />
        </RoleGate>
      </Route>
      <Route path="/finance/freelancers/directory">
        <RoleGate>
          <FinanceFreelancerDirectory />
        </RoleGate>
      </Route>
      <Route path="/freelancers">
        <RoleGate>
          <FinanceFreelancerDashboard />
        </RoleGate>
      </Route>
      <Route path="/finance/freelancers">
        <RoleGate>
          <FinanceFreelancerEngagements />
        </RoleGate>
      </Route>


      <Route path="/finance/ledgers">
        <RoleGate>
          <FinanceLedgers />
        </RoleGate>
      </Route>
      <Route path="/finance/payments/:source/:id">
        <RoleGate>
          <FinancePaymentDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/payments">
        <RoleGate>
          <FinancePayments />
        </RoleGate>
      </Route>
      <Route path="/finance/vendors/analytics">
        <RoleGate>
          <FinanceVendorAnalytics />
        </RoleGate>
      </Route>
      <Route path="/finance/vendors/:id">
        <RoleGate>
          <FinanceVendorDetail />
        </RoleGate>
      </Route>
      <Route path="/finance/vendors">
        <RoleGate>
          <FinanceVendors />
        </RoleGate>
      </Route>
      <Route path="/finance/tax">
        <RoleGate>
          <FinanceTax />
        </RoleGate>
      </Route>
      <Route path="/finance/reports/pnl">
        <RoleGate>
          <FinanceReportsPnl />
        </RoleGate>
      </Route>
      <Route path="/finance/notifications">
        <RoleGate>
          <FinanceNotifications />
        </RoleGate>
      </Route>
      <Route path="/finance">
        <RoleGate>
          <FinanceDashboard />
        </RoleGate>
      </Route>

      <Route path="/freelancer">
        <RoleGate allowedRoles={["freelancer"]}>
          <FreelancerDashboard />
        </RoleGate>
      </Route>

      <Route path="/settings/:section">
        <RoleGate allowedRoles={PROFILE_PAGE_ROLES}>
          <SettingsPage />
        </RoleGate>
      </Route>
      <Route path="/settings">
        <RoleGate allowedRoles={PROFILE_PAGE_ROLES}>
          <SettingsPage />
        </RoleGate>
      </Route>

      <Route path="/dev">
        <RoleGate>
          <DevHome />
        </RoleGate>
      </Route>
      <Route path="/dev/projects/:id">
        <RoleGate>
          <AdminProjectDetail />
        </RoleGate>
      </Route>
      <Route path="/dev/projects">
        <RoleGate>
          <DevProjects />
        </RoleGate>
      </Route>
      <Route path="/dev/logs">
        <RoleGate>
          <DevLogs />
        </RoleGate>
      </Route>
      <Route path="/dev/tasks/:id">
        <RoleGate>
          <TaskDetail />
        </RoleGate>
      </Route>
      <Route path="/dev/tasks">
        <RoleGate>
          <DevTasks />
        </RoleGate>
      </Route>
      <Route path="/dev/bugs">
        <RoleGate>
          <DevBugs />
        </RoleGate>
      </Route>
      <Route path="/dev/apk">
        <RoleGate>
          <DevApk />
        </RoleGate>
      </Route>
      <Route path="/dev/reports">
        <RoleGate>
          <DevReports />
        </RoleGate>
      </Route>
      <Route path="/dev/requests">
        <RoleGate>
          <DevRequests />
        </RoleGate>
      </Route>
      <Route path="/dev/payments">
        <RoleGate>
          <MyFreelancerPayments />
        </RoleGate>
      </Route>
      <Route path="/dev/my-screenshots">
        <RoleGate>
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
        <RoleGate allowedRoles={PROFILE_PAGE_ROLES}>
          <ProfilePage />
        </RoleGate>
      </Route>
      <Route path="/notifications">
        <RoleGate allowedRoles={PROFILE_PAGE_ROLES}>
          <NotificationsPage />
        </RoleGate>
      </Route>

      <Route path="/hrm/departments"><RoleGate><HrmDepartments /></RoleGate></Route>
      <Route path="/hrm/employees/:id"><RoleGate><HrmEmployeeDetail /></RoleGate></Route>
      <Route path="/hrm/employees"><RoleGate><HrmEmployees /></RoleGate></Route>
      <Route path="/hrm/leave"><RoleGate><HrmLeave /></RoleGate></Route>
      <Route path="/hrm/wfh"><RoleGate><HrmWfh /></RoleGate></Route>
      <Route path="/hrm/shifts"><RoleGate><HrmShifts /></RoleGate></Route>
      <Route path="/hrm/calendar"><RoleGate><HrmCalendar /></RoleGate></Route>
      <Route path="/hrm/holidays"><RoleGate><HrmHolidays /></RoleGate></Route>
      <Route path="/hrm/attendance"><RoleGate><HrmAttendance /></RoleGate></Route>
      <Route path="/hrm/payroll"><RoleGate><HrmPayroll /></RoleGate></Route>
      <Route path="/hrm/salary-slips"><RoleGate><HrmSalarySlips /></RoleGate></Route>
      <Route path="/hrm/manual-payslips"><RoleGate><HrmManualPayslips /></RoleGate></Route>
      <Route path="/hrm/my-attendance"><RoleGate><HrmMyAttendance /></RoleGate></Route>
      <Route path="/hrm/my-leave"><RoleGate><HrmMyLeave /></RoleGate></Route>
      <Route path="/hrm/my-wfh"><RoleGate><HrmMyWfh /></RoleGate></Route>
      <Route path="/hrm/my-payslips"><RoleGate><HrmMyPayslips /></RoleGate></Route>
      <Route path="/hrm/my-holidays"><RoleGate><HrmMyHolidays /></RoleGate></Route>
      <Route path="/hrm/settings"><RoleGate><HrmSettings /></RoleGate></Route>
      <Route path="/hrm/recruitment"><RoleGate><HrmRecruitment /></RoleGate></Route>
      <Route path="/hrm/onboarding"><RoleGate><HrmOnboarding /></RoleGate></Route>
      <Route path="/hrm/documents"><RoleGate><HrmDocuments /></RoleGate></Route>
      <Route path="/hrm/policies"><RoleGate><HrmPolicies /></RoleGate></Route>
      <Route path="/hrm/hr-kit"><RoleGate><HrmHrKit /></RoleGate></Route>

      <Route path="/hrm/assets"><RoleGate><HrmAssets /></RoleGate></Route>
      <Route path="/hrm/exit"><RoleGate><HrmExit /></RoleGate></Route>
      <Route path="/hrm/id-cards"><RoleGate><HrmIdCards /></RoleGate></Route>
      <Route path="/hrm/letters"><RoleGate><HrmExperienceLetters /></RoleGate></Route>
      <Route path="/hrm/audit"><RoleGate><HrmAudit /></RoleGate></Route>
      <Route path="/hrm">
        <RoleGate>
          <HrmDashboard />
        </RoleGate>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}
