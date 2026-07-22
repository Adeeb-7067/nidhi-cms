import type { Notification } from "@/api";
import type { UserRole } from "@/lib/navigation";
import { getDiscussionsHref } from "@/lib/discussions-navigation";
import { getProjectDetailHref } from "@/lib/project-routes";
import { getLocationSearch, clearLocationParam } from "@/lib/electron-bridge";

export type NotificationNavTarget = {
  href: string;
  label: string;
};

type NotificationLike = Pick<
  Notification,
  "type" | "entityType" | "entityId" | "projectId"
>;

function finiteId(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Resolve where the user should land for a notification. */
export function getNotificationTarget(
  notification: NotificationLike,
  role: UserRole | string | undefined,
): NotificationNavTarget | null {
  const type = (notification.type ?? "").toLowerCase();
  const entityType = (notification.entityType ?? type ?? "").toLowerCase();
  const entityId = finiteId(notification.entityId);
  const projectId =
    finiteId(notification.projectId) ??
    (entityType === "project" ? entityId : null);

  if (entityType === "ticket" || type.startsWith("ticket")) {
    if (entityId != null) {
      return { href: `/admin/tickets?ticket=${entityId}`, label: "Open ticket" };
    }
    return { href: "/admin/tickets", label: "Tickets" };
  }

  if (entityType === "bug" || type === "bug") {
    if (entityId != null) {
      return { href: `/dev/bugs?bug=${entityId}`, label: "Open bug" };
    }
    if (projectId != null) {
      return { href: `/dev/bugs?projectId=${projectId}`, label: "Bugs" };
    }
    return { href: "/dev/bugs", label: "Bugs" };
  }

  if (entityType === "task" || type === "task") {
    if (entityId != null) {
      return { href: `/dev/tasks/${entityId}`, label: "Open task" };
    }
    return { href: "/dev/tasks", label: "Tasks" };
  }

  if (type === "comment" || type === "comment_mention") {
    if (entityType === "company_team_unofficial") {
      return {
        href: getDiscussionsHref(null, { companyTeamUnofficial: true }),
        label: "Open unofficial chat",
      };
    }
    if (entityType === "company_team") {
      return {
        href: getDiscussionsHref(null, { companyTeam: true }),
        label: "Open official chat",
      };
    }
    if (entityType === "direct" && entityId != null) {
      return {
        href: getDiscussionsHref(null, { directConversationId: entityId }),
        label: "Open message",
      };
    }
    if ((entityType === "project" || entityType === "project_internal") && entityId != null) {
      return {
        href: getDiscussionsHref(entityId, { internal: entityType === "project_internal" }),
        label: entityType === "project_internal" ? "Open internal chat" : "Open discussion",
      };
    }
    if (entityType === "ticket" && entityId != null) {
      return { href: `/admin/tickets?ticket=${entityId}`, label: "Open ticket" };
    }
  }

  if (
    entityType === "log" ||
    type === "log" ||
    entityType === "daily_log_compliance" ||
    type === "log_compliance"
  ) {
    return { href: "/dev/logs", label: "Daily logs" };
  }

  if (entityType === "request" || type === "request") {
    if (role === "super_admin") {
      return { href: "/admin/requests", label: "Requests" };
    }
    return { href: "/dev/requests", label: "Requests" };
  }

  if (entityType === "project") {
    if (entityId == null) return null;
    if (role === "client") {
      return { href: "/client", label: "Client portal" };
    }
    return { href: getProjectDetailHref(entityId, role), label: "Open project" };
  }

  if (
    entityType === "subscription" ||
    entityType === "inventory" ||
    type === "inventory"
  ) {
    if (projectId != null && role === "super_admin") {
      return { href: `/admin/projects/${projectId}`, label: "Project inventory" };
    }
  }

  if (entityType === "work_session" || type === "work_session") {
    // Monitorable staff → screenshots; everyone else → notifications hub (still actionable).
    if (
      role === "developer" ||
      role === "tester" ||
      role === "qa" ||
      role === "manager" ||
      role === "hr"
    ) {
      return { href: "/dev/my-screenshots", label: "Work session" };
    }
    return { href: "/notifications", label: "View notifications" };
  }

  return null;
}

export function canNavigateNotification(
  notification: NotificationLike,
  role: UserRole | string | undefined,
): boolean {
  return getNotificationTarget(notification, role) != null;
}

function readPositiveIntParam(key: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(getLocationSearch()).get(key);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Read `?ticket=` from the current URL (ticket detail deep-link). */
export function readTicketIdFromUrl(): number | null {
  return readPositiveIntParam("ticket");
}

/** Read `?bug=` from the current URL (bug detail deep-link). */
export function readBugIdFromUrl(): number | null {
  return readPositiveIntParam("bug");
}

/** Remove a query param without reloading the page. */
export function clearUrlSearchParam(key: string): void {
  clearLocationParam(key);
}
