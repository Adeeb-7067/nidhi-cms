import React from "react";
import { cn } from "@/lib/utils";

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

function splitUrlAndSuffix(raw: string): { url: string; suffix: string } {
  let url = raw;
  let suffix = "";
  while (/[.,;:!?)]+$/.test(url)) {
    const match = url.match(/[.,;:!?)]+$/);
    if (!match) break;
    suffix = match[0] + suffix;
    url = url.slice(0, -match[0].length);
  }
  return { url, suffix };
}

function toHref(url: string): string {
  return url.startsWith("www.") ? `https://${url}` : url;
}

export function LinkifiedText({
  text,
  className,
  linkClassName,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(URL_REGEX.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const { url, suffix } = splitUrlAndSuffix(match[0]);
    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={toHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-medium underline underline-offset-2 break-all",
          linkClassName ?? "text-primary hover:text-primary/80",
        )}
      >
        {url}
      </a>,
    );
    if (suffix) parts.push(suffix);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return <span className={className}>{text}</span>;

  return <span className={className}>{parts}</span>;
}
