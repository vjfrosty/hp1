import { notFound, privateJson, uuidParam } from "@/lib/api/route";
import { requireUser } from "@/lib/auth/current-user";
import { loadGroup } from "@/lib/community/groups";

/** GET /api/groups/[id] */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();
  const group = await loadGroup(auth.user.id, id);
  return group ? privateJson(group) : notFound();
}
