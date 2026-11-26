import "server-only";

import type { Me } from "@hp1/shared";

import { isAdmin } from "@/lib/auth/admin";
import type { UserRow } from "@/lib/db/users";

export async function toMe(user: UserRow): Promise<Me> {
  return {
    id: user.id,
    nickname: user.nickname,
    ageConfirmed: user.ageConfirmedAt !== null,
    isAdmin: await isAdmin(user.clerkUserId),
  };
}
