import Link from "next/link";

import { UserMenu } from "@/components/auth/user-menu";
import { AgeGate } from "@/components/AgeGate";

// Shell for signed-in screens. proxy.ts redirects signed-out visitors.
// Phase 2 replaces this with the ported AppShell (tabs: feed, radar, …).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface/90 px-5 py-3 backdrop-blur">
        <Link href="/feed" className="font-display text-xl font-bold tracking-tight">
          АЙДЕ ПО ЕДНА!
        </Link>
        <UserMenu />
      </header>
      <AgeGate />
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
