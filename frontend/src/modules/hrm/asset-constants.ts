export const ASSET_CATEGORIES = [
  "Laptop",
  "Monitor",
  "Headset",
  "Phone",
  "Keyboard",
  "Mouse",
  "Chair",
  "ID Card",
  "Other",
] as const;

export const ASSET_STATUSES = ["assigned", "in_stock", "in_repair", "retired"] as const;

export const ASSET_CONDITIONS = ["new", "good", "fair", "poor"] as const;

export const ASSET_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  in_stock: "In stock",
  in_repair: "In repair",
  retired: "Retired",
};

export const ASSET_CONDITION_LABELS: Record<string, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export function assetStatusTone(status: string): "success" | "info" | "warning" | "muted" {
  if (status === "assigned") return "success";
  if (status === "in_stock") return "info";
  if (status === "in_repair") return "warning";
  return "muted";
}
