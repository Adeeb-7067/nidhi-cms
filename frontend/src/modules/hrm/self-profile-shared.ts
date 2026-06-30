import * as z from "zod";
import {
  enrichEmployeeFormFromHrmDocuments,
  mapUserToTeamEmployeeForm,
  type TeamEmployeeFormValues,
} from "@/modules/admin/employee-form-shared";
import { normalizePhoneForSubmit, optionalPhoneZod } from "@/lib/phone-input";
import type { HrmEmployeeDocument } from "@/modules/hrm/types";
import { usesEmployeeSelfProfileOnPage } from "@/lib/user-roles";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
});

export const selfProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  designation: z.string().optional(),
  avatarUrl: z.string().optional(),
  phoneNumber: optionalPhoneZod,
  dob: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  bloodGroup: z.string().optional(),
  bio: z.string().optional(),
  aadharNumber: z.string().optional(),
  panNumber: z.string().optional(),
  permanentAddress: addressSchema.optional(),
  currentAddress: addressSchema.optional(),
  linkedinUrl: z.string().optional(),
  socialTwitter: z.string().optional(),
  socialFacebook: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialWebsite: z.string().optional(),
  resumeUrl: z.string().optional(),
  idProofUrl: z.string().optional(),
  addressProofUrl: z.string().optional(),
  bankAccountHolder: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  bankIfsc: z.string().optional(),
});

export type SelfProfileFormValues = z.infer<typeof selfProfileSchema>;

type AuthUserLike = {
  role: string;
  employeeId?: string | null;
};

/** Extended employee self-service form — company HRM employees only (not freelancers/clients). */
export function usesEmployeeSelfProfile(user: AuthUserLike | null | undefined): boolean {
  if (!user) return false;
  return usesEmployeeSelfProfileOnPage(user.role, user.employeeId);
}

export function defaultSelfProfileFormValues(): SelfProfileFormValues {
  return {
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    designation: "",
    avatarUrl: "",
    phoneNumber: "",
    dob: "",
    gender: "",
    maritalStatus: "",
    bloodGroup: "",
    bio: "",
    aadharNumber: "",
    panNumber: "",
    permanentAddress: { street: "", city: "", state: "", country: "", zipCode: "" },
    currentAddress: { street: "", city: "", state: "", country: "", zipCode: "" },
    linkedinUrl: "",
    socialTwitter: "",
    socialFacebook: "",
    socialInstagram: "",
    socialWebsite: "",
    resumeUrl: "",
    idProofUrl: "",
    addressProofUrl: "",
    bankAccountHolder: "",
    bankAccountNumber: "",
    bankName: "",
    bankBranch: "",
    bankIfsc: "",
  };
}

type UserLike = Record<string, unknown>;

function teamValuesToSelfProfile(
  team: TeamEmployeeFormValues,
  user: UserLike,
): SelfProfileFormValues {
  return {
    firstName: team.firstName ?? "",
    lastName: team.lastName ?? "",
    name: team.name ?? "",
    email: team.email ?? "",
    designation: team.designation ?? "",
    avatarUrl: (user.avatarUrl as string) ?? (user.image as string) ?? "",
    phoneNumber: team.phoneNumber ?? "",
    dob: team.dob ?? "",
    gender: team.gender ?? "",
    maritalStatus: team.maritalStatus ?? "",
    bloodGroup: team.bloodGroup ?? "",
    bio: team.bio ?? "",
    aadharNumber: team.aadharNumber ?? "",
    panNumber: team.panNumber ?? "",
    permanentAddress: team.permanentAddress ?? defaultSelfProfileFormValues().permanentAddress,
    currentAddress: team.currentAddress ?? defaultSelfProfileFormValues().currentAddress,
    linkedinUrl: team.linkedinUrl ?? "",
    socialTwitter: team.socialTwitter ?? "",
    socialFacebook: team.socialFacebook ?? "",
    socialInstagram: team.socialInstagram ?? "",
    socialWebsite: team.socialWebsite ?? "",
    resumeUrl: team.resumeUrl ?? "",
    idProofUrl: team.idProofUrl ?? "",
    addressProofUrl: team.addressProofUrl ?? "",
    bankAccountHolder: team.bankAccountHolder ?? "",
    bankAccountNumber: team.bankAccountNumber ?? "",
    bankName: team.bankName ?? "",
    bankBranch: team.bankBranch ?? "",
    bankIfsc: team.bankIfsc ?? "",
  };
}

/**
 * Hydrate self-profile form from a user record — uses the same mapper as admin team employee form
 * so every field stays in sync with HR/admin data entry.
 */
export function mapUserToSelfProfileForm(
  user: UserLike,
  documents?: HrmEmployeeDocument[],
): SelfProfileFormValues {
  const team = mapUserToTeamEmployeeForm(user, null);
  const enriched = documents?.length
    ? enrichEmployeeFormFromHrmDocuments(team, documents)
    : team;
  return teamValuesToSelfProfile(enriched, user);
}

/** Payload for PATCH /auth/me — mirrors team employee personal fields (no HR/admin keys). */
export function buildSelfProfilePayload(values: SelfProfileFormValues) {
  const fullName =
    `${values.firstName?.trim() ?? ""} ${values.lastName?.trim() ?? ""}`.trim() || values.name.trim();

  return {
    name: fullName,
    firstName: values.firstName?.trim() ?? "",
    lastName: values.lastName?.trim() ?? "",
    email: values.email.trim().toLowerCase(),
    designation: values.designation?.trim() || undefined,
    avatarUrl: values.avatarUrl?.trim() || undefined,
    phoneNumber: normalizePhoneForSubmit(values.phoneNumber) || "",
    dob: values.dob || null,
    gender: values.gender?.trim() ?? "",
    maritalStatus: values.maritalStatus?.trim() ?? "",
    bloodGroup: values.bloodGroup?.trim() ?? "",
    bio: values.bio ?? "",
    aadharNumber: values.aadharNumber ? Number(values.aadharNumber) : null,
    panNumber: values.panNumber?.trim() || null,
    permanentAddress: values.permanentAddress,
    currentAddress: values.currentAddress,
    linkedinUrl: values.linkedinUrl ?? "",
    socialProfiles: {
      linkedin: values.linkedinUrl ?? "",
      twitter: values.socialTwitter ?? "",
      facebook: values.socialFacebook ?? "",
      instagram: values.socialInstagram ?? "",
      website: values.socialWebsite ?? "",
    },
    resumeUrl: values.resumeUrl || null,
    idProofUrl: values.idProofUrl || null,
    addressProofUrl: values.addressProofUrl || null,
    salary: {
      bankAccount: {
        accountHolderName: values.bankAccountHolder ?? "",
        accountNumber: values.bankAccountNumber ?? "",
        bankName: values.bankName ?? "",
        branchName: values.bankBranch ?? "",
        ifsc: values.bankIfsc ?? "",
      },
    },
  };
}

/** Stable key for form hydration — changes when server profile data changes. */
export function selfProfileHydrateKey(
  user: UserLike,
  documents?: HrmEmployeeDocument[],
): string {
  const docKey =
    documents?.map((d) => `${d.category ?? ""}:${d.fileUrl ?? ""}`).join("|") ?? "";
  return JSON.stringify({ form: mapUserToSelfProfileForm(user, documents), docKey });
}
