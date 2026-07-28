import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs } from "@/components/cms";
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
      />

      <CmsChipTabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { value: "roster", label: "Roster" },
          { value: "performance", label: "Performance" },
        ]}
      />

      {activeTab === "roster" ? (
        <BdeTeamRosterPanel onOpenSalesDetail={openMemberSheet} />
      ) : (
        <BdePerformanceTab onSelectMember={openMemberSheet} />
      )}

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
