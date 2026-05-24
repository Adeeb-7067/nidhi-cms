export type TicketChatPresetRole = "super_admin" | "client" | "staff";

export const TICKET_CHAT_PRESETS: Record<TicketChatPresetRole, string[]> = {
  super_admin: [
    "Thanks for reaching out — we're looking into this now.",
    "Could you share more details or a screenshot?",
    "We've reproduced the issue and are working on a fix.",
    "This is fixed on our side — please verify and let us know.",
    "Marking this resolved. Reply here if anything is still wrong.",
  ],
  client: [
    "I'm still seeing this issue — any update?",
    "Here are the steps to reproduce…",
    "I've attached more details above.",
    "That fixed it on my end, thank you!",
    "One more question about this ticket.",
  ],
  staff: [
    "Investigating — will update shortly.",
    "Blocked on environment access / credentials.",
    "Fix deployed to staging; please verify.",
    "Need clarification from the client on expected behavior.",
    "Root cause identified; patch in progress.",
  ],
};

export function ticketPresetRole(userRole?: string): TicketChatPresetRole {
  if (userRole === "super_admin") return "super_admin";
  if (userRole === "client") return "client";
  return "staff";
}
