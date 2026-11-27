import type { ChronicleLikeResult } from "@hp1/shared";

import { notFound, privateJson, uuidParam } from "@/lib/api/route";
import { requireAdultUser } from "@/lib/auth/current-user";
import { loadChronicle, toggleLike } from "@/lib/community/chronicles";
import { limitWrite } from "@/lib/community/limits";

/** POST /api/chronicles/[id]/like — toggles the viewer's like on a chronicle they can see. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdultUser();
  if (!auth.ok) return auth.response;
  const id = uuidParam((await ctx.params).id);
  if (!id) return notFound();
  const limited = await limitWrite("like", auth.user.id);
  if (limited) return limited;

  // 404, not 403, for invisible chronicles: do not confirm they exist.
  if (!(await loadChronicle(auth.user.id, id))) return notFound();
  const result: ChronicleLikeResult = await toggleLike(id, auth.user.id);
  return privateJson(result);
}
