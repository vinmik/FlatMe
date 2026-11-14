import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/lib/auth/store";
import { config } from "@/lib/config";
import { useSessionCheck } from "./hooks";

/** Gate for operator-only routes. A pass-through while VITE_ADMIN_AUTH_DISABLED is on. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  return config.authDisabled ? <>{children}</> : <SessionGate>{children}</SessionGate>;
}

function SessionGate({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const location = useLocation();
  useSessionCheck();

  if (!token || user?.role !== "admin") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}