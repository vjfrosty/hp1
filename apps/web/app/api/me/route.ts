import { toMe } from "@/lib/api/me";
import { requireUser } from "@/lib/auth/current-user";

export async function GET() {
  const result = await requireUser();
  if (!result.ok) return result.response;
  return Response.json(await toMe(result.user), { headers: { "Cache-Control": "private, no-store" } });
}
