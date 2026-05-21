import { toIso } from "@/lib/mongo-list";

export type UserDoc = {
  id: number;
  employeeId?: string | null;
  name: string;
  email: string;
  role: string;
  subType?: string | null;
  designation?: string | null;
  avatarUrl?: string | null;
  status: string;
  lastLoginAt?: Date | null;
  createdAt?: Date | null;
};

export function formatUser(user: UserDoc) {
  return {
    id: user.id,
    employeeId: user.employeeId ?? null,
    name: user.name,
    email: user.email,
    role: user.role,
    subType: user.subType ?? null,
    designation: user.designation ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    lastLoginAt: toIso(user.lastLoginAt),
    createdAt: toIso(user.createdAt) ?? new Date().toISOString(),
  };
}
