import { ageConfirmationSchema } from "@hp1/shared";

import { toMe } from "@/lib/api/me";
import { requireUser } from "@/lib/auth/current-user";
import { confirmAge } from "@/lib/db/users";

/** Records the 18+ confirmation as a timestamp. No birth date is stored. */
export async function POST(req: Request) {
  const result = await requireUser();
  if (!result.ok) return result.response;

  const parsed = ageConfirmationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  const user = await confirmAge(result.user.id);
  return Response.json(await toMe(user), { headers: { "Cache-Control": "private, no-store" } });
}
