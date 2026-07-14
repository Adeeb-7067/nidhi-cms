/** Shared attachment preview labels for discussion chat list / notifications. */
export function attachmentPreviewLabel(
  attachmentMimeType?: string | null,
  attachmentName?: string | null,
): string | null {
  if (!attachmentMimeType && !attachmentName) return null;
  if (attachmentMimeType === "application/pdf" || attachmentName?.toLowerCase().endsWith(".pdf")) {
    return "Sent a PDF";
  }
  if (
    attachmentMimeType === "application/vnd.android.package-archive" ||
    attachmentName?.toLowerCase().endsWith(".apk")
  ) {
    return "Sent an APK";
  }
  if (
    attachmentMimeType?.startsWith("audio/") ||
    /\.(webm|ogg|mp3|m4a|wav)$/i.test(attachmentName ?? "")
  ) {
    return "Sent a voice message";
  }
  if (attachmentMimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(attachmentName ?? "")) {
    return "Sent an image";
  }
  return "Sent an attachment";
}

export function discussionCommentPreview(comment: {
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentMimeType?: string | null;
  attachmentName?: string | null;
  isDeleted?: boolean;
}): string {
  if (comment.isDeleted) return "This message was deleted";
  const text = comment.content?.trim();
  if (text) return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  if (comment.attachmentUrl) {
    return attachmentPreviewLabel(comment.attachmentMimeType, comment.attachmentName) ?? "New message";
  }
  return "New message";
}
