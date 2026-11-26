import { WifiOff } from "lucide-react";

export const metadata = { title: "Офлайн — АЙДЕ ПО ЕДНА!" };

// Precached by the service worker. Static, holds no user data.
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-10 w-10 text-burgundy" />
      <h1 className="font-display text-3xl font-bold">Няма връзка</h1>
      <p className="max-w-sm text-ink-muted">
        Сбирките, чатът и потвържденията изискват интернет. Опитайте отново, когато връзката се върне.
      </p>
    </main>
  );
}
