import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";

import { isClerkConfigured } from "@/lib/auth/config";

/**
 * Optional catch-all route: Clerk runs its multi-step flows under this path.
 * 404 without Clerk keys, so `next build` works without them.
 */
export default function SignInPage() {
  if (!isClerkConfigured) notFound();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16">
      <span className="font-display text-3xl font-bold tracking-tight text-ink">АЙДЕ ПО ЕДНА!</span>
      <SignIn />
      <p className="max-w-sm text-center text-xs text-ink-muted">
        Само за пълнолетни (18+). Организираме компания, а не състезание по пиене.
      </p>
    </main>
  );
}
