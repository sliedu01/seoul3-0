"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "MEMBER";
  name: string | null;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isMember: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const isAdmin = user?.role === "ADMIN";
  const isOperator = user?.role === "OPERATOR";
  const isMember = user?.role === "MEMBER";

  // ADMIN can do everything
  // OPERATOR can create/edit but not delete
  // MEMBER can only view
  const canEdit = isAdmin || isOperator;
  const canDelete = isAdmin;

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isOperator,
        isMember,
        canEdit,
        canDelete,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
