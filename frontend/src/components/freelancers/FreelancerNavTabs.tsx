import { useLocation } from "wouter";
import { LayoutDashboard, Users, Wallet, Receipt } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FreelancerTabKey = "dashboard" | "freelancers" | "payments" | "receipts";

const TAB_ROUTES: Record<FreelancerTabKey, string> = {
  dashboard: "/finance/freelancers/dashboard",
  freelancers: "/finance/freelancers/directory",
  payments: "/finance/freelancers",
  receipts: "/finance/freelancers/receipts",
};

export function FreelancerNavTabs({ activeTab }: { activeTab: FreelancerTabKey }) {
  const [, setLocation] = useLocation();

  const handleValueChange = (val: string) => {
    const route = TAB_ROUTES[val as FreelancerTabKey];
    if (route) {
      setLocation(route);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange} className="mb-6">
      <TabsList className="grid w-full grid-cols-4 max-w-xl">
        <TabsTrigger value="dashboard" className="gap-2">
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </TabsTrigger>
        <TabsTrigger value="freelancers" className="gap-2">
          <Users className="h-4 w-4" /> All Freelancers
        </TabsTrigger>
        <TabsTrigger value="payments" className="gap-2">
          <Wallet className="h-4 w-4" /> Payments
        </TabsTrigger>
        <TabsTrigger value="receipts" className="gap-2">
          <Receipt className="h-4 w-4" /> Receipts
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
