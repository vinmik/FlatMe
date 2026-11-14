import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster, toast } from "@/components/ui";
import { isApiError } from "@/lib/api";
import { config } from "@/lib/config";
import { ThemeProvider } from "./theme";

/** Auth failures normally end the session (handled by the API client), so they don't need a toast too. */
const endsSession = (error: unknown) => !config.authDisabled && isApiError(error) && error.isAuthFailure;

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Background refetch failures would otherwise be silent once data is on screen.
        if (query.state.data !== undefined && !endsSession(error)) {
          toast.error("Couldn't refresh data", error.message);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.meta?.silentError) return;
        if (endsSession(error)) return;
        toast.error("Action failed", error.message);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
          return count < 2;
        },
      },
    },
  });
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silentError?: boolean };
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
