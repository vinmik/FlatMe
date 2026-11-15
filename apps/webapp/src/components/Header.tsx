"use client";

import { Heart, Home, LogOut, Plus, Search, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { signOutEverywhere } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { Avatar, buttonClass } from "@/ui";
import { Logo } from "./Logo";

const NAV = [
  { href: "/flats", label: "Browse flats", icon: Search, auth: false },
  { href: "/saved", label: "Saved", icon: Heart, auth: true },
  { href: "/my-listings", label: "My listings", icon: Home, auth: true },
] as const;

export function Header() {
  const path = usePathname();
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);
  const active = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-[1100] border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.filter((n) => !n.auth || user).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active(n.href) ? "bg-primary-soft text-primary-hover" : "text-muted hover:bg-gray-100 hover:text-fg",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block">
              <Link href="/post" className={buttonClass("primary", "sm")}>
                <Plus className="size-4" aria-hidden />
                Post a room
              </Link>
            </span>
            {!ready ? (
              <span className="size-9" />
            ) : user ? (
              <AccountMenu name={user.fullName || user.email} email={user.email} avatarUrl={user.avatarUrl} />
            ) : (
              <Link href="/signin" className={buttonClass("secondary", "sm")}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Phone-width navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[1100] grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {[
          { href: "/flats", label: "Browse", icon: Search },
          { href: "/saved", label: "Saved", icon: Heart },
          { href: "/post", label: "Post", icon: Plus },
          { href: user ? "/profile" : "/signin", label: user ? "Profile" : "Sign in", icon: UserIcon },
        ].map((n) => (
          <Link
            key={n.label}
            href={n.href}
            aria-current={active(n.href) ? "page" : undefined}
            className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium", active(n.href) ? "text-primary" : "text-muted")}
          >
            <n.icon className="size-5" aria-hidden />
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function AccountMenu({ name, email, avatarUrl }: { name: string; email: string; avatarUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)} className="flex rounded-full">
        <Avatar name={name} src={avatarUrl} size={36} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-sm text-muted">{email}</p>
          </div>
          {[
            { href: "/profile", label: "Profile & settings", icon: UserIcon },
            { href: "/my-listings", label: "My listings", icon: Home },
            { href: "/saved", label: "Saved flats", icon: Heart },
          ].map((i) => (
            <Link key={i.href} role="menuitem" href={i.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50">
              <i.icon className="size-4 text-muted" aria-hidden />
              {i.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={signOutEverywhere}
            className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
