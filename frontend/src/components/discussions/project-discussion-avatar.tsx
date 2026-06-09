import type { Project } from "@/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { projectAvatarInitials } from "@/lib/discussion-chat-format";
import { cn } from "@/lib/utils";

type ProjectDiscussionAvatarProps = {
  project: Pick<Project, "name" | "logoUrl">;
  className?: string;
  fallbackClassName?: string;
};

export function ProjectDiscussionAvatar({
  project,
  className,
  fallbackClassName,
}: ProjectDiscussionAvatarProps) {
  const logo = project.logoUrl?.trim();

  return (
    <Avatar className={cn("shrink-0", className)}>
      {logo ? <AvatarImage src={logo} alt={project.name} className="object-cover" /> : null}
      <AvatarFallback className={cn("rounded-full text-xs font-bold", fallbackClassName)}>
        {projectAvatarInitials(project.name)}
      </AvatarFallback>
    </Avatar>
  );
}
