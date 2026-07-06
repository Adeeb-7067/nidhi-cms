import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PortalPageShell, PortalTabsList, PortalTabsTrigger } from "@/components/layout/portal-page-kit";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { SalesPageHeader } from "@/modules/sales/components";
import { type SalesTeamMember } from "@/api/sales";
import { type User } from "@/api";
import {
  BdePerformanceTab,
  BdeTeamRosterPanel,
  BdeMemberSheet,
  BdeTeamFormDialog,
} from "@/modules/sales/team";

export default function Team() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("roster");
  const [sheetUserId, setSheetUserId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openMemberSheet = (member: SalesTeamMember) => {
    setSheetUserId(member.id);
    setSheetOpen(true);
  };

  const openEditFromSheet = (userId: number) => {
    setSheetOpen(false);
    setEditUser({ id: userId, name: "", email: "", role: "bde", status: "active", createdAt: "" } as User);
    setFormOpen(true);
  };

  if (user?.role === "bde") {
    return <Redirect to="/sales/bde" replace />;
  }

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Sales team"
        description="Manage BDE roster and track sales performance."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Team" },
        ]}
        actions={
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <PortalTabsList>
              <PortalTabsTrigger value="roster">Roster</PortalTabsTrigger>
              <PortalTabsTrigger value="performance">Performance</PortalTabsTrigger>
            </PortalTabsList>
          </Tabs>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="roster" className="mt-0">
          <BdeTeamRosterPanel onOpenSalesDetail={openMemberSheet} />
        </TabsContent>
        <TabsContent value="performance" className="mt-0">
          <BdePerformanceTab onSelectMember={openMemberSheet} />
        </TabsContent>
      </Tabs>

      <BdeMemberSheet
        userId={sheetUserId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onEdit={openEditFromSheet}
      />

      <BdeTeamFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditUser(null);
        }}
        editUser={editUser}
      />
    </PortalPageShell>
  );
}
