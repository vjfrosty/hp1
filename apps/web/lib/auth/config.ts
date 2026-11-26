/**
 * Whether this build has Clerk keys. Ported from DentAnnotate `lib/auth/config.ts`.
 *
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is read by direct member access so Next.js
 * inlines it at build time; a destructured read would be `undefined` in the browser.
 *
 * Unlike DentAnnotate, "not configured" does NOT mean "anonymous mode". It only
 * lets `next build` and CI run without keys. Protected API routes fail closed
 * with 503 (see `lib/auth/current-user.ts`, AGENTS.md rule 1).
 */
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export const isClerkConfigured = CLERK_PUBLISHABLE_KEY.length > 0;

export const SIGN_IN_URL = "/sign-in";
export const SIGN_UP_URL = "/sign-up";
/** Where a signed-in user lands. */
export const AFTER_SIGN_IN_URL = "/feed";
