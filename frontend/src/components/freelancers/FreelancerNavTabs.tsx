import { useLocation } from "wouter";
import { CmsChipTabs } from "@/components/cms";

export type FreelancerTabKey = "dashboard" | "freelancers" | "payments" | "receipts";

const TAB_ROUTES: Record<FreelancerTabKey, string> = {
  dashboard: "/freelancers/dashboard",
  freelancers: "/freelancers/directory",
  payments: "/freelancers/payments",
  receipts: "/freelancers/receipts",
};

export function FreelancerNavTabs({ activeTab }: { activeTab: FreelancerTabKey }) {
  const [, setLocation] = useLocation();

  return (
    <CmsChipTabs
      value={activeTab}
      onValueChange={(val) => {
        const route = TAB_ROUTES[val as FreelancerTabKey];
        if (route) setLocation(route);
      }}
      items={[
        { value: "dashboard", label: "Dashboard" },
        { value: "freelancers", label: "All freelancers" },
        { value: "payments", label: "Payments" },
        { value: "receipts", label: "Receipts" },
      ]}
    />
  );
}
