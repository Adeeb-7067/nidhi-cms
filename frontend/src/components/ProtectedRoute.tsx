import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { AppLoadingScreen } from "@/components/loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, isInitializing, accessToken } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isInitializing && !isLoading && !accessToken) {
      setLocation("/login");
    }
  }, [isInitializing, isLoading, accessToken, setLocation]);

  if (isInitializing || isLoading) {
    return (
      <AppLoadingScreen
        message="Preparing your workspace"
        submessage="Verifying your session…"
      />
    );
  }

  if (!accessToken || !user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
};
