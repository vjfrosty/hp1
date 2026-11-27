import { users } from "./schema";

/** Columns for a `UserSummary` (packages/shared/src/api/events.ts). Never email or Clerk id. */
export const userSummaryColumns = {
  id: users.id,
  nickname: users.nickname,
  avatarInitials: users.avatarInitials,
  avatarColor: users.avatarColor,
  avatarUrl: users.avatarUrl,
  roleId: users.roleId,
};
