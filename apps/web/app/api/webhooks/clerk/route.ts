import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { deleteByClerkId, syncFromClerk } from "@/lib/db/users";

/**
 * Clerk → local users sync. Public in proxy.ts; authenticated by the Svix
 * signature instead (CLERK_WEBHOOK_SIGNING_SECRET). Rows are also created
 * lazily on first request, so this never gates sign-in.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const u = evt.data;
      const nickname =
        u.username ||
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        "Гост";
      await syncFromClerk(u.id, { nickname, avatarUrl: u.image_url || null });
      break;
    }
    case "user.deleted": {
      if (evt.data.id) await deleteByClerkId(evt.data.id);
      break;
    }
  }
  return Response.json({ received: true });
}
