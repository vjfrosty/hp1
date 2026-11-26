"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/auth/config";

/**
 * Avatar menu or sign-in button. `<Show when="signed-in">`, not `<SignedIn>`:
 * the latter was removed in Clerk Core 3 and throws.
 */
export function UserMenu() {
  if (!isClerkConfigured) return null;

  return (
    <Show
      when="signed-in"
      fallback={
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-tavern hover:bg-surface-muted"
          >
            Вход
          </button>
        </SignInButton>
      }
    >
      <UserButton />
    </Show>
  );
}
