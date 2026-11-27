"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { ApiError, isSessionExpired } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // 401/403/404 will not fix themselves; retrying only delays the
            // sign-in prompt or the "not found" screen.
            retry: (count, error) =>
              !isSessionExpired(error) &&
              !(error instanceof ApiError && [403, 404].includes(error.status)) &&
              count < 2,
          },
          // Offline is read-only: never queue writes for later.
          mutations: { networkMode: "online" },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
