import type { DirectConversationPeer } from "@/api/direct-conversations";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type NewConversationPickerProps = {
  open: boolean;
  onClose: () => void;
  contacts: DirectConversationPeer[];
  existingPeerIds: Set<number>;
  isLoading?: boolean;
  onSelectContact: (contact: DirectConversationPeer) => void;
  title?: string;
};

export function NewConversationPicker({
  open,
  onClose,
  contacts,
  existingPeerIds,
  isLoading,
  onSelectContact,
  title = "New conversation",
}: NewConversationPickerProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = contacts.filter((c) => !existingPeerIds.has(c.id));
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [contacts, existingPeerIds, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          "flex max-h-[85dvh] w-full flex-col overflow-hidden bg-background shadow-xl",
          "rounded-t-2xl border border-border/70 sm:max-w-md sm:rounded-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-border/60 px-4 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search people"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-lg border-border/60 bg-muted/40 pl-9 text-sm"
            />
          </div>
        </div>
        <div className="dialog-scroll min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading contacts…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {query.trim() ? "No matches" : "Everyone here already has a chat open"}
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    onClick={() => {
                      onSelectContact(contact);
                      setQuery("");
                    }}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      {contact.avatarUrl ? (
                        <AvatarImage src={contact.avatarUrl} alt={contact.name} />
                      ) : null}
                      <AvatarFallback className="bg-muted text-xs">
                        {contact.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{contact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {contact.subtitle ?? contact.role}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
