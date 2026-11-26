import "server-only";

import { auth } from "@clerk/nextjs/server";

/**
 * Admin comes from Clerk `publicMetadata.role` (exposed through session claims)
 * or the `ADMIN_USER_IDS` env list. Never from a request body.
 */
export function adminUserIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export async function isAdmin(clerkUserId: string): Promise<boolean> {
  if (adminUserIds().has(clerkUserId)) return true;
  const { sessionClaims } = await auth();
  const metadata = (sessionClaims?.metadata ?? sessionClaims?.publicMetadata) as
    | { role?: unknown }
    | undefined;
  return metadata?.role === "admin";
}
