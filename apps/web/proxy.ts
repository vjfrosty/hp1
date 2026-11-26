import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { SIGN_IN_URL, SIGN_UP_URL, isClerkConfigured } from "@/lib/auth/config";

/**
 * Request-time page gate (ported from DentAnnotate `proxy.ts`).
 *
 * It decides which PAGES redirect to sign-in. It is not the authority for the
 * API: every route handler calls `requireUser()` itself, and /api is left
 * public here so a missing session gets a JSON 401 instead of a redirect.
 *
 * Without Clerk keys it does nothing; protected API routes then answer 503.
 */

/** Pages a signed-out visitor may open. */
const PUBLIC_PATTERNS = [
  SIGN_IN_URL,
  SIGN_UP_URL,
  "/__clerk",
  "/i", // invite landing: title, city, date, organiser nickname only
  "/api", // route handlers authorise themselves
  "/serwist",
  "/manifest.webmanifest",
  "/offline",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATTERNS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

type Handler = (
  request: NextRequest,
  event: NextFetchEvent,
) => ReturnType<typeof NextResponse.next> | Promise<Response | undefined | void> | undefined;

let handler: Handler | null = null;

async function clerkHandler(): Promise<Handler> {
  if (handler) return handler;
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  handler = clerkMiddleware(
    async (auth, request) => {
      if (!isPublic(request.nextUrl.pathname)) {
        await auth.protect();
      }
    },
    // Without these, signed-out visitors go to Clerk's hosted portal.
    { signInUrl: SIGN_IN_URL, signUpUrl: SIGN_UP_URL },
  ) as Handler;
  return handler;
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkConfigured) return NextResponse.next();
  return (await clerkHandler())(request, event);
}

export const config = {
  matcher: [
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|webmanifest)$).*)",
  ],
};
