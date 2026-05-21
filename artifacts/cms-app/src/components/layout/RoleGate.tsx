import React from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/navigation";
import { getProjectsListHref } from "@/lib/project-routes";

export function RoleGate({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [location] = useLocation();

  if (user && !allowedRoles.includes(user.role as UserRole)) {
    if (location === "/admin/projects" && (user.role === "developer" || user.role === "tester")) {
      return <Redirect to={getProjectsListHref(user.role)} replace />;
    }
  }

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
