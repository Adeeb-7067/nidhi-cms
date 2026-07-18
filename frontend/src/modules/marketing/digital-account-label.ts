/** Label for a digital workspace account in pickers / tables. */
export function digitalAccountLabel(account: {
  projectName?: string | null;
  companyName?: string | null;
}): string {
  if (account.projectName) {
    return `${account.projectName} · ${account.companyName || "Company"}`;
  }
  return account.companyName || "Unknown project";
}
