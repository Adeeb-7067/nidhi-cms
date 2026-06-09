export type MentionCandidate = {
  id: number;
  name: string;
};

export function projectMembersToMentionCandidates(
  members: { userId: number; name: string }[] | undefined,
  excludeUserId?: number,
): MentionCandidate[] {
  if (!members?.length) return [];
  const seen = new Set<number>();
  const out: MentionCandidate[] = [];
  for (const m of members) {
    const name = m.name?.trim();
    if (!name || !m.userId || seen.has(m.userId)) continue;
    if (excludeUserId != null && m.userId === excludeUserId) continue;
    seen.add(m.userId);
    out.push({ id: m.userId, name });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function buildMentionCandidatesFromMessages(
  messages: { authorId: number; authorName: string }[],
): MentionCandidate[] {
  const map = new Map<number, MentionCandidate>();
  for (const m of messages) {
    const name = m.authorName?.trim();
    if (!m.authorId || !name) continue;
    map.set(m.authorId, { id: m.authorId, name });
  }
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function parseActiveMentionQuery(
  text: string,
  cursor: number,
): { query: string; start: number; end: number } | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([^\s@]*)$/);
  if (!match) return null;
  const start = cursor - match[0].length;
  return { query: match[1], start, end: cursor };
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return candidates.slice(0, 8);
  return candidates
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, 8);
}

export function insertMentionAtCursor(
  text: string,
  start: number,
  end: number,
  mention: MentionCandidate,
): { text: string; cursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const insertion = `@${mention.name} `;
  return {
    text: before + insertion + after,
    cursor: before.length + insertion.length,
  };
}

export function extractMentionedUserIds(
  content: string,
  candidates: MentionCandidate[],
): number[] {
  if (!content || !candidates.length) return [];
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  const ids = new Set<number>();
  for (const c of sorted) {
    const token = `@${c.name}`;
    let idx = content.indexOf(token);
    while (idx !== -1) {
      const after = content[idx + token.length];
      if (!after || /[\s.,;:!?)\]]/.test(after)) {
        ids.add(c.id);
      }
      idx = content.indexOf(token, idx + 1);
    }
  }
  return [...ids];
}

export type MentionTextSegment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; userId: number };

export function splitTextWithMentions(
  text: string,
  candidates: MentionCandidate[],
): MentionTextSegment[] {
  if (!text) return [];
  if (!candidates.length) return [{ type: "text", value: text }];

  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length);
  const parts: MentionTextSegment[] = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] === "@") {
      let matched: MentionCandidate | null = null;
      for (const c of sorted) {
        const token = `@${c.name}`;
        if (text.slice(i, i + token.length) !== token) continue;
        const after = text[i + token.length];
        if (!after || /[\s.,;:!?)\]]/.test(after)) {
          matched = c;
          break;
        }
      }
      if (matched) {
        parts.push({ type: "mention", value: `@${matched.name}`, userId: matched.id });
        i += `@${matched.name}`.length;
        continue;
      }
    }

    let j = i + 1;
    while (j < text.length) {
      if (text[j] !== "@") {
        j++;
        continue;
      }
      let wouldMatch = false;
      for (const c of sorted) {
        const token = `@${c.name}`;
        if (text.slice(j, j + token.length) === token) {
          const after = text[j + token.length];
          if (!after || /[\s.,;:!?)\]]/.test(after)) {
            wouldMatch = true;
            break;
          }
        }
      }
      if (wouldMatch) break;
      j++;
    }
    parts.push({ type: "text", value: text.slice(i, j) });
    i = j;
  }

  return parts;
}
