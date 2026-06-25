import { useGetProjectClientTeam, type ProjectClientContact } from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, ShieldCheck, Users } from "lucide-react";

interface ProjectClientTeamPanelProps {
  projectId: number;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "text-green-600 border-green-500/30 bg-green-500/10";
    case "pending":
      return "text-amber-600 border-amber-500/30 bg-amber-500/10";
    default:
      return "text-muted-foreground border-border bg-muted/30";
  }
}

function ContactCard({ contact }: { contact: ProjectClientContact }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
        {contact.avatarUrl ? (
          <img
            src={contact.avatarUrl}
            alt={contact.name ?? ""}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          getInitials(contact.name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{contact.name ?? "—"}</span>
          {contact.isAdmin && (
            <Badge variant="outline" className="text-xs text-violet-600 border-violet-500/30 bg-violet-500/10 gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          )}
          {!contact.isAdmin && (
            <Badge
              variant="outline"
              className={`text-xs capitalize ${statusBadgeClass(contact.status ?? "")}`}
            >
              {contact.status ?? "—"}
            </Badge>
          )}
        </div>
        {contact.title && (
          <p className="text-xs text-muted-foreground mt-0.5">{contact.title}</p>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5"
          >
            <Mail className="h-3 w-3" />
            {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}

export function ProjectClientTeamPanel({ projectId }: ProjectClientTeamPanelProps) {
  const { data, isLoading } = useGetProjectClientTeam(projectId, !!projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="bg-card">
          <CardHeader className="p-3 pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="p-3 pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAnyData = data?.primaryContact || (data?.members?.length ?? 0) > 0;

  if (!hasAnyData) {
    return (
      <Card className="bg-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No client contacts linked to this project.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data?.primaryContact && (
        <Card className="bg-card">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Primary Contact</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ContactCard contact={data.primaryContact} />
          </CardContent>
        </Card>
      )}

      {(data?.members?.length ?? 0) > 0 && (
        <Card className="bg-card">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Team Members
              <span className="ml-2 text-xs font-normal text-muted-foreground/70">
                ({data!.members.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {data!.members.map((member) => (
              <ContactCard key={member.userId} contact={member} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
