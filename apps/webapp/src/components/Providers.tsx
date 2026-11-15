"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { queryClient } from "@/lib/hooks";
import { usePlace } from "@/lib/place";
import { useSession } from "@/lib/session";
import { Toaster } from "@/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  // Saved sign-in and location live in the browser only, so they are read after the first paint.
  useEffect(() => {
    useSession.getState().hydrate();
    usePlace.getState().hydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
