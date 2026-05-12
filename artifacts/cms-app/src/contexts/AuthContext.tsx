import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@workspace/api-client-react";
import { useGetMe, setAuthTokenGetter, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem("accessToken"));
  const [, setLocation] = useLocation();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("accessToken"));
  }, []);

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!accessToken,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setAccessToken(null);
    }
  }, [error]);

  const login = (token: string, refreshToken: string, userData: User) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("refreshToken", refreshToken);
    setAccessToken(token);
    
    if (userData.role === "super_admin") {
      setLocation("/admin");
    } else if (userData.role === "developer") {
      setLocation("/dev");
    } else if (userData.role === "client") {
      setLocation("/client");
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAccessToken(null);
    setLocation("/login");
  };

  const isLoading = accessToken ? isUserLoading : false;

  return (
    <AuthContext.Provider value={{ user: user || null, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
