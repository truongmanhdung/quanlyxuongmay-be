"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, clearToken } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: "admin";
}

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ role: string; user: AdminUser }>("/auth/me")
      .then((res) => {
        if (res.role === "admin") {
          setUser(res.user);
          connectSocket();
        } else {
          clearToken();
          setUser(null);
        }
      })
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: AdminUser }>("/auth/admin/login", {
      username,
      password,
    });
    setToken(res.token);
    setUser(res.user);
    connectSocket();
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    clearToken();
    setUser(null);
    router.push("/signin");
  }, [router]);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
