"use client";

import React, { createContext, useContext, ReactNode } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  name: string;
  username: string;
  role: "manager" | "supervisor" | "owner";
  storeId: number | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: unknown;
  logout: () => Promise<void>;
  mutate: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }
  const data = await res.json();
  return data.user;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR<User | null>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      mutate(null, false);
      router.push("/login");
    } catch (error: unknown) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, isLoading, error, logout, mutate }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
