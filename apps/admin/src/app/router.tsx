import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from "react-router";
import { Skeleton } from "@/components/ui";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAdmin } from "@/features/auth/RequireAdmin";
import { config } from "@/lib/config";
import { RouteError } from "./ErrorBoundary";
import { AppLayout } from "./layout/AppLayout";
import { NotFound } from "./NotFound";

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"));
const UsersPage = lazy(() => import("@/features/users/UsersPage"));
const ListingsPage = lazy(() => import("@/features/listings/ListingsPage"));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage"));
const AuditPage = lazy(() => import("@/features/audit/AuditPage"));
const DataExplorerPage = lazy(() => import("@/features/data/DataExplorerPage"));

function PageFallback() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-brand" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-brand" />
    </div>
  );
}

const page = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

export const routes: RouteObject[] = [
  { path: "/login", element: config.authDisabled ? <Navigate to="/" replace /> : <LoginPage />, errorElement: <RouteError /> },
  {
    path: "/",
    element: (
      <RequireAdmin>
        <AppLayout />
      </RequireAdmin>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(<DashboardPage />) },
      { path: "users", element: page(<UsersPage />) },
      { path: "listings", element: page(<ListingsPage />) },
      { path: "reports", element: page(<ReportsPage />) },
      { path: "audit", element: page(<AuditPage />) },
      { path: "data", element: page(<DataExplorerPage />) },
      { path: "*", element: <NotFound /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
