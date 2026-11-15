"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { Skeleton } from "@/ui";

/** Shows its children only to signed-in people with a finished profile; everyone else is sent to the right step. */
export function RequireAuth({ children, allowIncomplete = false }: { children: ReactNode; allowIncomplete?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const ready = useSession((s) => s.ready);
  const user = useSession((s) => s.user);
  const needsProfile = !!user && !user.profileComplete && !allowIncomplete;

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`/signin?next=${encodeURIComponent(path)}`);
    else if (needsProfile) router.replace(`/welcome?next=${encodeURIComponent(path)}`);
  }, [ready, user, needsProfile, path, router]);

  if (!ready || !user || needsProfile) {
    return (
      <div role="status" aria-label="Loading" className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full rounded-brand" />
        <Skeleton className="h-40 w-full rounded-brand" />
      </div>
    );
  }
  return <>{children}</>;
}
