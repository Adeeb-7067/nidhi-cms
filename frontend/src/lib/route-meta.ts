import { getProjectsListHref } from "@/lib/project-routes";
import type { UserRole } from "@/lib/navigation";

/** Page titles & descriptions — used by Navbar and optional AppLayout header */

export type RouteMeta = {
  title: string;
  description?: string;
  /** Page renders its own hero/header */
  hideHeader?: boolean;
};

const STATIC_ROUTES: Record<string, RouteMeta> = {
  "/admin": {
    title: "Dashboard",
    description: "Overview of projects, team activity, and items needing attention.",
    hideHeader: true,
  },
  "/admin/projects": {
    title: "Projects",
    description: "Browse and manage all client projects.",
  },
  "/admin/employees": {
    title: "Team",
    description: "Manage employees, roles, and access.",
  },
  "/admin/monitoring/analytics": {
    title: "Monitoring analytics",
    description: "Work sessions, clock vs logs, consent, and screenshots.",
    hideHeader: true,
  },
  "/admin/clients": {
    title: "Companies",
    description: "Company accounts and their projects.",
  },
  "/admin/requests": {
    title: "Requests",
    description: "Review and approve resource requests from the team.",
  },
  "/admin/tickets": {
    title: "Support tickets",
    description: "Track and resolve client and internal support issues.",
  },
  "/discussions": {
    title: "Discussions",
    description: "Team and client conversation threads.",
    hideHeader: true,
  },
  "/admin/analytics": {
    title: "Analytics",
    description: "Agency-wide metrics and performance trends.",
  },
  "/sales": {
    title: "Admin dashboard",
    description: "Super admin control center — leads, revenue, team, and pipeline at a glance.",
    hideHeader: true,
  },
  "/sales/leads": {
    title: "Lead management",
    description: "View, assign, and manage all leads across sources.",
    hideHeader: true,
  },
  "/sales/follow-ups": {
    title: "Follow-ups & activities",
    description: "Calendar, overdue tracking, and activity logs.",
    hideHeader: true,
  },
  "/sales/proposals": {
    title: "Proposals",
    description: "Quotations and estimates sent to prospects.",
    hideHeader: true,
  },
  "/sales/proposals/create": {
    title: "Create proposal",
    description: "Build a new quotation with line items and terms.",
    hideHeader: true,
  },
  "/sales/installments": {
    title: "Installment management",
    description: "Milestone billing, due dates, and collection progress.",
    hideHeader: true,
  },
  "/sales/invoices": {
    title: "Invoices",
    description: "Billing documents generated from approved proposals.",
    hideHeader: true,
  },
  "/sales/payments": {
    title: "Payments",
    description: "Payment collection, receipts, and outstanding balances.",
    hideHeader: true,
  },
  "/sales/customers": {
    title: "Customer management",
    description: "Converted clients and account relationships.",
    hideHeader: true,
  },
  "/sales/products": {
    title: "Products & services",
    description: "Central product catalog, pricing, and tax configuration.",
    hideHeader: true,
  },
  "/sales/team": {
    title: "Sales team",
    description: "Executive performance, targets, and leaderboard.",
    hideHeader: true,
  },
  "/sales/reports": {
    title: "Sales reports",
    description: "Conversion, revenue, and pipeline analytics.",
    hideHeader: true,
  },
  "/sales/notifications": {
    title: "Sales alerts",
    description: "Lead assignments, follow-ups, and payment updates.",
    hideHeader: true,
  },
  "/sales/settings": {
    title: "Automation & settings",
    description: "Lead assignment, status flow, notifications, and tax rules.",
    hideHeader: true,
  },
  "/finance": {
    title: "Finance dashboard",
    description: "Company-wide financial overview — income, expenses, budgets, and cash flow.",
    hideHeader: true,
  },
  "/finance/expenses": {
    title: "Expenses",
    description: "Track, approve, and analyse company spending.",
    hideHeader: true,
  },
  "/finance/income": {
    title: "Income",
    description: "Track client payments and revenue collections.",
    hideHeader: true,
  },
  "/finance/invoices": {
    title: "Invoices",
    description: "Create, track, and manage client billing documents.",
    hideHeader: true,
  },
  "/finance/payroll": {
    title: "Payroll",
    description: "Salary structures, monthly processing, and salary slips.",
    hideHeader: true,
  },
  "/finance/budgets": {
    title: "Budgets",
    description: "Annual and project budgets with variance tracking.",
    hideHeader: true,
  },
  "/finance/ledgers": {
    title: "Ledgers",
    description: "Client, vendor, expense, and bank account ledgers.",
    hideHeader: true,
  },
  "/finance/payments": {
    title: "Payments",
    description: "Incoming and outgoing payments, receipts, and due reminders.",
    hideHeader: true,
  },
  "/finance/tax": {
    title: "Tax",
    description: "GST dashboard, TDS summaries, and compliance reports.",
    hideHeader: true,
  },
  "/finance/reports/pnl": {
    title: "Financial reports",
    description: "Profit & loss, profitability analysis, and revenue analytics.",
    hideHeader: true,
  },
  "/marketing": {
    title: "Marketing dashboard",
    description: "Agency overview — tasks, approvals, campaigns, and team performance.",
    hideHeader: true,
  },
  "/marketing/tasks": {
    title: "Marketing tasks",
    description: "Daily task management with status, priority, and deadlines.",
    hideHeader: true,
  },
  "/marketing/clients": {
    title: "Marketing clients",
    description: "Assigned client accounts, packages, and budgets.",
    hideHeader: true,
  },
  "/marketing/calendar": {
    title: "Content calendar",
    description: "Scheduled posts across platforms with approval status.",
    hideHeader: true,
  },
  "/marketing/graphics": {
    title: "Graphics queue",
    description: "Design requests, revisions, and deliverable files.",
    hideHeader: true,
  },
  "/marketing/videos": {
    title: "Video queue",
    description: "Reel and video production pipeline.",
    hideHeader: true,
  },
  "/marketing/social": {
    title: "Social analytics",
    description: "Per-platform followers, reach, and engagement.",
    hideHeader: true,
  },
  "/marketing/meta-ads": {
    title: "Meta Ads",
    description: "Facebook and Instagram campaign performance.",
    hideHeader: true,
  },
  "/marketing/google-ads": {
    title: "Google Ads",
    description: "Search, Display, Shopping, PMax, and YouTube campaigns.",
    hideHeader: true,
  },
  "/marketing/seo": {
    title: "SEO panel",
    description: "Keyword rankings, backlinks, audits, and Core Web Vitals.",
    hideHeader: true,
  },
  "/marketing/content": {
    title: "Content queue",
    description: "Blogs, captions, scripts, and emails.",
    hideHeader: true,
  },
  "/marketing/approvals": {
    title: "Approval workflow",
    description: "Internal and client review pipeline.",
    hideHeader: true,
  },
  "/marketing/performance": {
    title: "Team performance",
    description: "Productivity, delivery time, and client ratings.",
    hideHeader: true,
  },
  "/marketing/reports": {
    title: "Marketing reports",
    description: "Daily, weekly, and monthly report exports.",
    hideHeader: true,
  },
  "/settings": {
    title: "Settings",
    description: "Appearance, notifications, workspace, and account preferences.",
    hideHeader: true,
  },
  "/dev": {
    title: "Workspace",
    description: "Your projects, shortcuts, and recent activity.",
    hideHeader: true,
  },
  "/dev/projects": {
    title: "My projects",
    description: "Ongoing and maintenance projects assigned to you.",
    hideHeader: true,
  },
  "/dev/logs": {
    title: "Daily logs",
    description: "Record and review daily work logs.",
  },
  "/dev/tasks": {
    title: "Tasks",
    description: "Assign and track work items across the team.",
  },
  "/dev/bugs": {
    title: "Bug tracker",
    description: "Report, assign, and track bugs across projects.",
  },
  "/dev/apk": {
    title: "Releases",
    description: "Upload and distribute APK and build releases.",
  },
  "/dev/reports": {
    title: "Reports",
    description: "Generate and download project reports.",
  },
  "/dev/requests": {
    title: "My requests",
    description: "Resource requests you have submitted.",
  },
  "/client": {
    title: "Portal",
    description: "Your projects, documents, and updates.",
    hideHeader: true,
  },
  "/client/analytics": {
    title: "Analytics",
    description: "Progress and metrics for your projects.",
  },
  "/client/apk": {
    title: "Downloads",
    description: "Latest app builds shared with you.",
  },
  "/notifications": {
    title: "Notifications",
    description: "All alerts and updates in one place.",
  },
  "/profile": {
    title: "Profile",
    description: "Your account settings and preferences.",
    hideHeader: true,
  },
};

export type RouteBreadcrumb = {
  label: string;
  href?: string;
};

export function getRouteBreadcrumbs(pathname: string, role?: UserRole | string): RouteBreadcrumb[] {
  const meta = getRouteMeta(pathname);

  if (/^\/admin\/projects\/\d+$/.test(pathname) && role && role !== "super_admin") {
    const home =
      role === "client"
        ? { label: "Client", href: "/client" as const }
        : { label: "Dev", href: "/dev" as const };
    return [
      home,
      {
        label: role === "tester" || role === "qa" ? "My QA projects" : "My projects",
        href: getProjectsListHref(role),
      },
      { label: meta.title },
    ];
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: meta.title }];

  const zones: Record<string, { label: string; home: string }> = {
    admin: { label: "Admin", home: "/admin" },
    sales: { label: "Sales", home: "/sales" },
    finance: { label: "Finance", home: "/finance" },
    dev: { label: "Dev", home: "/dev" },
    client: { label: "Client", home: "/client" },
    settings: { label: "Settings", home: "/settings" },
    notifications: { label: "Alerts", home: "/notifications" },
    discussions: { label: "Discussions", home: "/discussions" },
    profile: { label: "Account", home: "/profile" },
  };

  const zone = parts[0];
  const zoneInfo = zones[zone];
  if (!zoneInfo) return [{ label: meta.title }];

  const crumbs: RouteBreadcrumb[] = [{ label: zoneInfo.label, href: zoneInfo.home }];
  if (pathname === zoneInfo.home) {
    crumbs.push({ label: meta.title });
    return crumbs;
  }

  let acc = `/${zone}`;
  for (let i = 1; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const isLast = i === parts.length - 1;
    if (/^\d+$/.test(parts[i])) {
      crumbs.push({ label: meta.title });
      break;
    }
    if (isLast) {
      crumbs.push({ label: meta.title });
    } else {
      crumbs.push({ label: getRouteMeta(acc).title, href: acc });
    }
  }
  return crumbs;
}

export function getRouteMeta(pathname: string): RouteMeta {
  if (STATIC_ROUTES[pathname]) return STATIC_ROUTES[pathname];

  if (/^\/dev\/projects\/\d+/.test(pathname)) {
    return {
      title: "Project",
      description: "Project overview, resources, and delivery.",
      hideHeader: true,
    };
  }

  if (/^\/admin\/projects\/\d+/.test(pathname)) {
    return {
      title: "Project",
      description: "Project overview, resources, and delivery.",
      hideHeader: true,
    };
  }

  if (/^\/dev\/tasks\/\d+/.test(pathname)) {
    return {
      title: "Task",
      description: "Task details, description, and properties.",
      hideHeader: true,
    };
  }

  if (/^\/sales\/leads\/\d+/.test(pathname)) {
    return { title: "Lead details", hideHeader: true };
  }
  if (/^\/sales\/proposals\/\d+/.test(pathname)) {
    return { title: "Proposal details", hideHeader: true };
  }
  if (/^\/sales\/installments\/\d+/.test(pathname)) {
    return { title: "Installment details", hideHeader: true };
  }
  if (/^\/sales\/invoices\/\d+/.test(pathname)) {
    return { title: "Invoice details", hideHeader: true };
  }
  if (/^\/sales\/receipts\/\d+/.test(pathname)) {
    return { title: "Payment receipt", hideHeader: true };
  }
  if (/^\/sales\/customers\/\d+/.test(pathname)) {
    return { title: "Customer profile", hideHeader: true };
  }
  if (/^\/finance\/invoices\/\d+/.test(pathname)) {
    return { title: "Invoice details", hideHeader: true };
  }

  return { title: "CMS", description: undefined };
}
