import { ClipboardList, Database, Flag, Home, LayoutDashboard, LogOut, ShieldOff, Users, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect } from "react";
import { NavLink } from "react-router";
import { Avatar, Badge } from "@/components/ui";
import { useOverlay } from "@/components/ui/useOverlay";
import { useStats } from "@/features/dashboard/hooks";
import { authStore, useAuth } from "@/lib/auth/store";
import { cn } from "@/lib/cn";
import { config } from "@/lib/config";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/listings", label: "Listings", icon: Home },
  { to: "/reports", label: "Reports", icon: Flag, badge: "reports" as const },
  { to: "/audit", label: "Audit log", icon: ClipboardList },
  { to: "/data", label: "Data Explorer", icon: Database },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const stats = useStats();
  const openReports = stats.data?.reports.open ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <img src="/favicon.svg" alt="" className="size-8 rounded-[9px]" />
        <span className="text-[15px] font-semibold tracking-tight">FlatMe</span>
        <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent-fg uppercase">Admin</span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-[10px] bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="relative size-[18px]" aria-hidden />
                <span className="relative flex-1">{label}</span>
                {badge === "reports" && openReports > 0 && (
                  <motion.span
                    key={openReports}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    className="relative rounded-full bg-rose-500 px-1.5 py-px text-[11px] font-semibold text-white tabular"
                    aria-label={`${openReports} open reports`}
                  >
                    {openReports}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {config.useMocks && (
        <div className="mx-3 mb-3 rounded-brand border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <strong className="font-semibold">Demo mode</strong> — data is mocked in your browser and resets on reload.
        </div>
      )}

      <div className="border-t border-line p-3">
        {config.authDisabled ? (
          <div className="flex items-center gap-3 rounded-[10px] px-2 py-2" data-testid="user-chip">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <ShieldOff className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Admin (auth disabled)</p>
              <Badge tone="warning" dot className="mt-0.5" title="VITE_ADMIN_AUTH_DISABLED is on: anyone with the URL can use this portal.">
                No sign-in required
              </Badge>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[10px] px-2 py-2" data-testid="user-chip">
            <Avatar name={user?.fullName || user?.email || "Admin"} src={user?.avatarUrl ?? null} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.fullName || "Admin"}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => authStore.signOut("manual")}
              className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-rose-600"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const panelRef = useOverlay(mobileOpen, onClose);

  // The off-canvas menu is hidden at lg+, so close it if the viewport grows (releases the scroll lock).
  useEffect(() => {
    if (!mobileOpen || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && onClose();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mobileOpen, onClose]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
        {/* Separate layout groups so the active-pill animation never jumps between the two sidebars. */}
        <LayoutGroup id="sidebar-desktop">
          <SidebarContent />
        </LayoutGroup>
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-950/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden
            />
            <motion.aside
              ref={panelRef}
              data-overlay-panel
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              tabIndex={-1}
              className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-surface shadow-pop focus:outline-none"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-3 z-10 rounded-lg p-1.5 text-muted hover:bg-surface-2"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <LayoutGroup id="sidebar-mobile">
                <SidebarContent onNavigate={onClose} />
              </LayoutGroup>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}