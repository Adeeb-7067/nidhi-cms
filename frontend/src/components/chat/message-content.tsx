import React from "react";
import { LinkifiedText } from "@/components/chat/linkified-text";
import {
  splitTextWithMentions,
  type MentionCandidate,
} from "@/lib/chat-mentions";
import { cn } from "@/lib/utils";

export function MessageContent({
  text,
  mentionCandidates = [],
  className,
  linkClassName,
  mentionClassName,
}: {
  text: string;
  mentionCandidates?: MentionCandidate[];
  className?: string;
  linkClassName?: string;
  mentionClassName?: string;
}) {
  const segments = splitTextWithMentions(text, mentionCandidates);

  if (segments.length === 1 && segments[0].type === "text") {
    return (
      <LinkifiedText text={text} className={className} linkClassName={linkClassName} />
    );
  }

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <span
            key={`m-${i}-${seg.userId}`}
            className={cn(
              "font-semibold text-primary",
              mentionClassName,
            )}
          >
            {seg.value}
          </span>
        ) : (
          <LinkifiedText
            key={`t-${i}`}
            text={seg.value}
            linkClassName={linkClassName}
          />
        ),
      )}
    </span>
  );
}
