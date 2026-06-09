import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { MentionCandidate } from "@/lib/chat-mentions";

export type CompanyTeamMentionCandidatesResult = {
  candidates: MentionCandidate[];
};

export const companyTeamMentionCandidatesQueryKey = [
  "/api/comments/company-team/mention-candidates",
] as const;

export function fetchCompanyTeamMentionCandidates(): Promise<CompanyTeamMentionCandidatesResult> {
  return customFetch<CompanyTeamMentionCandidatesResult>(
    "/api/comments/company-team/mention-candidates",
  );
}

export function useCompanyTeamMentionCandidates(enabled = true) {
  return useQuery({
    queryKey: companyTeamMentionCandidatesQueryKey,
    queryFn: fetchCompanyTeamMentionCandidates,
    enabled,
    staleTime: 5 * 60_000,
  });
}
