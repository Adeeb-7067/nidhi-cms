import { AvatarWithPresence } from "./AvatarWithPresence";
import { usePresence } from "@/contexts/PresenceContext";
type CommentAuthorPresenceProps = {
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string | null;
  className?: string;
};

export function CommentAuthorPresence({
  authorId,
  authorName,
  authorAvatarUrl,
  className,
}: CommentAuthorPresenceProps) {
  const { getStatus } = usePresence();
  return (
    <AvatarWithPresence
      name={authorName}
      avatarUrl={authorAvatarUrl}
      presenceStatus={getStatus(authorId)}
      avatarClassName={className ?? "h-8 w-8"}
    />
  );
}
