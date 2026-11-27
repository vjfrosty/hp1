import { profilePatchSchema } from "@hp1/shared";
import { eq, sql } from "drizzle-orm";

import { badRequest, parseBody, privateJson } from "@/lib/api/route";
import { requireAdultUser, requireUser } from "@/lib/auth/current-user";
import { limitWrite } from "@/lib/community/limits";
import { buildProfileUpdate, toProfileDTO } from "@/lib/community/profile";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** GET /api/me/profile — the viewer's full own profile ("ракиен паспорт"). */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  return privateJson(toProfileDTO(auth.user));
}

/**
 * PATCH /api/me/profile — partial update. Only allow-listed fields are written;
 * earnedBadges, ageConfirmedAt, admin flags and ids are never taken from the body.
 */
export async function PATCH(req: Request) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const limited = await limitWrite("profile", auth.user.id);
  if (limited) return limited;

  const body = await parseBody(req, profilePatchSchema);
  if (!body.ok) return body.response;

  const update = buildProfileUpdate(body.data, auth.user);
  if (!update.ok) return badRequest(update.error);
  if (Object.keys(update.set).length === 0) return privateJson(toProfileDTO(auth.user));

  const [row] = await db
    .update(users)
    .set({ ...update.set, updatedAt: sql`now()` })
    .where(eq(users.id, auth.user.id))
    .returning();
  return privateJson(toProfileDTO(row));
}
