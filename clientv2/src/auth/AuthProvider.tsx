import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

import { api } from "../api/api";
import { AuthContext } from "./AuthContext";
import type { User } from "./AuthTypes";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    const t = localStorage.getItem("token");
    if (u && t) setUser(JSON.parse(u));
  }, []);

  const resolveRoute = (role: User["role"]) =>
    role === "vendor"
      ? "vendor"
      : role === "vendor_manager"
      ? "manager"
      : role === "warehouse_manager"
      ? "warehouse_manager"
      : "admin";

  const resolveDashboard = (role: User["role"]) =>
    role === "vendor"
      ? "/vendor/dashboard"
      : role === "vendor_manager"
      ? "/manager/dashboard"
      : role === "warehouse_manager"
      ? "/warehouse/dashboard"
      : "/admin/dashboard";

  const login = async (email: string, password: string, role: User["role"]) => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post(`/auth/${resolveRoute(role)}/login`, {
        email,
        password,
      });

      const { token, user } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      navigate(resolveDashboard(user.role));
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? "Login failed");
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register: async () => {},
        verifyOtp: async () => {},
        resendOtp: async () => {},
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
