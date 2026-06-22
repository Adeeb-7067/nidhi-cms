import type { LegalCounsel } from "../types";

export const legalCounsel: LegalCounsel[] = [
  { id: 1, name: "Adv. Meera Joshi", email: "meera.j@satyakabir.com", role: "legal_head" },
  { id: 2, name: "Adv. Arjun Patel", email: "arjun.p@satyakabir.com", role: "associate" },
  { id: 3, name: "LexCorp Associates", email: "matters@lexcorp.in", role: "external_counsel" },
];

export const counsel = (id: number) => legalCounsel.find((c) => c.id === id)!;
