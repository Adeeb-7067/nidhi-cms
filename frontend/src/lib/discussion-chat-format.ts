import { format, isToday, isYesterday, isSameDay, parseISO } from "date-fns";

/** WhatsApp-style time on the chat list (today → HH:mm, yesterday → label, else date). */
export function formatChatListTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const d = parseISO(iso);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "dd/MM/yy");
  } catch {
    return "";
  }
}

export function projectAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "#";
}

/** Date pill between message groups (Today, Yesterday, …). */
export function formatChatDateDivider(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  } catch {
    return "";
  }
}

export function shouldShowDateDivider(
  currentCreatedAt: string | undefined,
  previousCreatedAt: string | undefined,
): boolean {
  if (!currentCreatedAt) return false;
  if (!previousCreatedAt) return true;
  try {
    return !isSameDay(parseISO(currentCreatedAt), parseISO(previousCreatedAt));
  } catch {
    return true;
  }
}

export function formatMessageTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "";
  }
}

export function formatChatListPreview(options: {
  preview?: string;
  authorName?: string;
  authorId?: number;
  currentUserId?: number;
}): string {
  const { preview, authorName, authorId, currentUserId } = options;
  if (!preview) return "No messages yet";
  const prefix =
    authorId != null && currentUserId != null && authorId === currentUserId
      ? "You: "
      : authorName
        ? `${authorName}: `
        : "";
  return `${prefix}${preview}`;
}
