"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { isSessionExpired } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // A 401 will not fix itself; retrying only delays the sign-in prompt.
            retry: (count, error) => !isSessionExpired(error) && count < 2,
          },
          // Offline is read-only: never queue writes for later.
          mutations: { networkMode: "online" },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
