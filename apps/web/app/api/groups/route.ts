import { BULGARIAN_CITIES, createGroupSchema } from "@hp1/shared";

import { badRequest, parseBody, privateJson } from "@/lib/api/route";
import { requireAdultUser, requireUser } from "@/lib/auth/current-user";
import { loadGroup, loadGroups } from "@/lib/community/groups";
import { limitWrite } from "@/lib/community/limits";
import { groupMembers, groups } from "@/lib/db/schema";
import { withTransaction } from "@/lib/db/tx";

/** GET /api/groups?city=София — newest first, max 100, with isMember. */
export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const city = new URL(req.url).searchParams.get("city")?.trim() || undefined;
  if (city && !BULGARIAN_CITIES.some((c) => c.name === city)) return badRequest("city: unknown city");
  return privateJson(await loadGroups(auth.user.id, { city }));
}

/** POST /api/groups — creates a "Кръчмарски съвет"; the creator becomes its first member. */
export async function POST(req: Request) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const limited = await limitWrite("createGroup", auth.user.id);
  if (limited) return limited;

  const body = await parseBody(req, createGroupSchema);
  if (!body.ok) return body.response;
  const g = body.data;

  const id = await withTransaction(async (tx) => {
    const [row] = await tx
      .insert(groups)
      .values({
        name: g.name,
        // Legacy createGroup defaults.
        motto: g.motto || "Редовна маса, добра дума.",
        city: g.city,
        regularSchedule: g.regularSchedule || "Петък вечер",
        quorumRequired: g.quorumRequired,
        createdBy: auth.user.id,
      })
      .returning({ id: groups.id });
    await tx.insert(groupMembers).values({ groupId: row.id, userId: auth.user.id });
    return row.id;
  });

  return privateJson(await loadGroup(auth.user.id, id), { status: 201 });
}
