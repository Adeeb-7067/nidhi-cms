import { Building2, Lock, Megaphone, MessageCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiscussionAdminSection =
  | "team"
  | "team_direct"
  | "clients"
  | "digital_clients"
  | "clients_direct"
  | "internal";

export type DiscussionSectionRailProps = {
  activeSection: DiscussionAdminSection;
  onSectionChange: (section: DiscussionAdminSection) => void;
  teamUnread: number;
  teamDirectUnread: number;
  clientsUnread: number;
  digitalClientsUnread: number;
  clientsDirectUnread: number;
  internalUnread: number;
  clientsCount: number;
  digitalClientsCount: number;
  internalCount: number;
  className?: string;
};

type SectionDefinition = {
  id: DiscussionAdminSection;
  label: string;
  description: string;
  icon: typeof Users;
  unread: number;
  count?: number;
};

export function DiscussionSectionRail({
  activeSection,
  onSectionChange,
  teamUnread,
  teamDirectUnread,
  clientsUnread,
  digitalClientsUnread,
  clientsDirectUnread,
  internalUnread,
  clientsCount,
  digitalClientsCount,
  internalCount,
  className,
}: DiscussionSectionRailProps) {
  const sections: SectionDefinition[] = [
    {
      id: "team",
      label: "Office",
      description: "Official & unofficial",
      icon: Users,
      unread: teamUnread,
    },
    {
      id: "team_direct",
      label: "Staff 1:1",
      description: "Direct with staff",
      icon: MessageCircle,
      unread: teamDirectUnread,
    },
    {
      id: "clients",
      label: "Clients",
      description: "Delivery projects",
      icon: Building2,
      unread: clientsUnread,
      count: clientsCount,
    },
    {
      id: "digital_clients",
      label: "Digital",
      description: "Digital projects",
      icon: Megaphone,
      unread: digitalClientsUnread,
      count: digitalClientsCount,
    },
    {
      id: "clients_direct",
      label: "Client 1:1",
      description: "Direct with clients",
      icon: MessageCircle,
      unread: clientsDirectUnread,
    },
    {
      id: "internal",
      label: "Internal",
      description: "Staff only",
      icon: Lock,
      unread: internalUnread,
      count: internalCount,
    },
  ];

  return (
    <nav
      aria-label="Discussion sections"
      className={cn(
        "shrink-0 border-r border-border/70 bg-muted/40",
        "w-[68px] sm:w-[80px]",
        "flex flex-col items-stretch gap-1 px-1.5 py-3 sm:px-2 sm:py-4",
        className,
      )}
    >
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            aria-current={isActive ? "page" : undefined}
            title={`${section.label} · ${section.description}`}
            className={cn(
              "group relative flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10",
                isActive ? "bg-background/15" : "bg-background/0 group-hover:bg-background",
              )}
            >
              <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              {section.unread > 0 && (
                <span
                  className={cn(
                    "absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold leading-none tabular-nums",
                    "bg-emerald-500 text-white shadow-sm ring-2",
                    isActive ? "ring-foreground" : "ring-muted/40",
                  )}
                >
                  {section.unread > 99 ? "99+" : section.unread}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold leading-tight tracking-tight sm:text-[11px]">
              {section.label}
            </span>
            {section.count != null && (
              <span
                className={cn(
                  "text-[9px] tabular-nums leading-none",
                  isActive ? "text-background/70" : "text-muted-foreground/70",
                )}
              >
                {section.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
