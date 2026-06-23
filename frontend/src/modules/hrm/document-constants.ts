export const HRM_DOCUMENT_CATEGORIES = [
  { value: "id_proof", label: "ID Proof" },
  { value: "certificate", label: "Certificate" },
  { value: "contract", label: "Contract" },
  { value: "resume", label: "Resume" },
  { value: "general", label: "General" },
] as const;

export function documentCategoryLabel(value: string) {
  return HRM_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, " ");
}
