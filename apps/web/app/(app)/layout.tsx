import { AgeGate } from "@/components/AgeGate";
import { AppShell } from "@/components/shell/AppShell";

// Shell for signed-in screens. proxy.ts redirects signed-out visitors.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AgeGate />
      {children}
    </AppShell>
  );
}
