import type { ChronicleTagDTO, ChronicleVisibility, UserSummary } from "@hp1/shared";

/**
 * Pure access rules for chronicles and wisdom. The SQL in chronicles.ts /
 * wisdom.ts applies the same conditions in WHERE clauses (so LIMIT counts only
 * visible rows); these functions are the tested reference and a second check.
 */

export interface ChronicleViewContext {
  viewerId: string;
  authorId: string | null;
  visibility: ChronicleVisibility;
  hidden: boolean;
  /** Viewer and author block each other (either direction). */
  authorBlocked: boolean;
  /** Viewer is a member of chronicle.group_id (false when group_id is null). */
  isGroupMember: boolean;
  /** Viewer has a chronicle_tags row (consented or pending). */
  isTagged: boolean;
  /** Viewer organised or attended (confirmed) chronicle.event_id. */
  attendedEvent: boolean;
}

export function canViewChronicle(c: ChronicleViewContext): boolean {
  if (c.hidden) return false;
  if (c.authorBlocked) return false;
  if (c.authorId !== null && c.authorId === c.viewerId) return true;
  switch (c.visibility) {
    case "public":
      return true;
    case "group":
      return c.isGroupMember;
    case "friends":
      return c.isTagged || c.attendedEvent;
  }
}

export interface TagRowLike extends UserSummary {
  consentGivenAt: Date | null;
}

/**
 * Tags as the viewer may see them (AGENTS.md rule 7): consented tags for
 * everyone; pending tags only for the chronicle's author, marked pending.
 * Callers have already removed users who block / are blocked by the viewer.
 */
export function visibleTags(tags: TagRowLike[], viewerId: string, authorId: string | null): ChronicleTagDTO[] {
  const viewerIsAuthor = authorId !== null && authorId === viewerId;
  const out: ChronicleTagDTO[] = [];
  for (const t of tags) {
    const pending = t.consentGivenAt === null;
    if (pending && !viewerIsAuthor) continue;
    out.push({
      id: t.id,
      nickname: t.nickname,
      avatarInitials: t.avatarInitials,
      avatarColor: t.avatarColor,
      avatarUrl: t.avatarUrl,
      roleId: t.roleId,
      pending,
    });
  }
  return out;
}

export interface WisdomViewContext {
  viewerId: string;
  authorId: string | null;
  quotedUserId: string | null;
  sharedToGroup: boolean;
  groupId: string | null;
  /** Viewer is a member of wisdom.group_id. */
  isGroupMember: boolean;
  /** Viewer blocks / is blocked by the author or the quoted person. */
  blocked: boolean;
}

/**
 * Wisdom is never public. The author always sees it; the quoted person sees
 * what was said about them; group members see it only when it was shared to
 * their group. Unshared wisdom is the author's private note.
 */
export function canViewWisdom(c: WisdomViewContext): boolean {
  if (c.blocked) return false;
  if (c.authorId !== null && c.authorId === c.viewerId) return true;
  if (c.quotedUserId !== null && c.quotedUserId === c.viewerId) return true;
  return c.sharedToGroup && c.groupId !== null && c.isGroupMember;
}
