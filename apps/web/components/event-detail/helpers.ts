/**
 * Pure helpers for the event detail screen. No React, no "@/" imports, so the
 * node test runner (tests/ui-event-*.test.ts) can load this file directly.
 */
import { CHAT_STICKERS, HUMOROUS_ROLES, type AttendeeDTO, type HumorousRoleId, type PollDTO, type PublicEvent, type RSVPStatus, type UserSummary } from "@hp1/shared";

export const DELETED_USER = "изтрит участник";
export const QUORUM_SIZE = 3;

/**
 * Chat, polls and contributions are open only to the organiser and confirmed
 * attendees. The server sends `exactAddress` exactly to them (AGENTS.md rule 3),
 * so its presence is the signal; never derive access from anything else.
 */
export function canAccessPrivate(event: Pick<PublicEvent, "exactAddress" | "viewerIsOrganizer">): boolean {
  return event.exactAddress !== undefined || event.viewerIsOrganizer;
}

export function freeSeats(confirmed: number, maxAttendees: number): number {
  return Math.max(0, maxAttendees - confirmed);
}

export function hasQuorum(event: Pick<PublicEvent, "counts" | "isCancelled">): boolean {
  return !event.isCancelled && event.counts.confirmed >= QUORUM_SIZE;
}

export interface GroupedAttendees {
  confirmed: AttendeeDTO[];
  maybe: AttendeeDTO[];
  declined: AttendeeDTO[];
  pending: AttendeeDTO[];
}

export function groupAttendees(attendees: readonly AttendeeDTO[] | undefined): GroupedAttendees {
  const out: GroupedAttendees = { confirmed: [], maybe: [], declined: [], pending: [] };
  for (const a of attendees ?? []) {
    if (a.status === "confirmed") out.confirmed.push(a);
    else if (a.status === "maybe") out.maybe.push(a);
    else if (a.status === "declined") out.declined.push(a);
    else out.pending.push(a);
  }
  return out;
}

export function roleTitle(roleId: string | null | undefined): string | null {
  if (!roleId || !(roleId in HUMOROUS_ROLES)) return null;
  return HUMOROUS_ROLES[roleId as HumorousRoleId].title;
}

export function displayName(user: Pick<UserSummary, "nickname"> | null | undefined): string {
  return user?.nickname ?? DELETED_USER;
}

/** Sticker id -> "🥂 Наздраве!". Unknown ids (removed stickers) render as nothing. */
export function stickerText(id: string | null | undefined): string | null {
  if (!id) return null;
  const s = CHAT_STICKERS.find((x) => x.id === id);
  return s ? `${s.symbol} ${s.label}` : null;
}

/** Invite link for a private event. Only the organiser receives `inviteCode`. */
export function inviteUrl(origin: string, eventId: string, inviteCode?: string): string {
  const path = `${origin}/events/${encodeURIComponent(eventId)}`;
  return inviteCode ? `${path}?invite=${encodeURIComponent(inviteCode)}` : path;
}

/**
 * Link anyone may share: the organiser shares the invite link; others share the
 * plain link only for public events (a private event needs the invite code).
 */
export function shareableUrl(origin: string, event: Pick<PublicEvent, "id" | "inviteCode" | "isPrivate" | "friendsOnly">): string | null {
  if (event.inviteCode) return inviteUrl(origin, event.id, event.inviteCode);
  if (event.isPrivate || event.friendsOnly) return null;
  return inviteUrl(origin, event.id);
}

export function rsvpConfirmLabel(myStatus: RSVPStatus | null, manualApproval: boolean): string {
  if (myStatus === "confirmed") return "Идвам! (Потвърдено ✓)";
  if (myStatus === "pending_approval") return "Заявката чака одобрение";
  return manualApproval ? "Заяви участие" : "Идвам!";
}

/** Trimmed, non-empty poll options, or an error text in Bulgarian. */
export function cleanPollOptions(raw: readonly string[]): { ok: true; options: string[] } | { ok: false; error: string } {
  const options = raw.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2) return { ok: false, error: "Нужни са поне два варианта" };
  if (options.length > 6) return { ok: false, error: "Най-много шест варианта" };
  if (new Set(options.map((o) => o.toLocaleLowerCase("bg"))).size !== options.length) {
    return { ok: false, error: "Вариантите трябва да са различни" };
  }
  return { ok: true, options };
}

export interface PollVerdict {
  leaderLabel: string;
  leaderVotes: number;
  otherVotes: number;
}

/** Legacy "Официално решение" sentence data; null without votes or on a tie for first place. */
export function pollVerdict(poll: Pick<PollDTO, "options" | "totalVotes">): PollVerdict | null {
  if (poll.totalVotes <= 0 || poll.options.length === 0) return null;
  const sorted = [...poll.options].sort((a, b) => b.votes - a.votes);
  const [leader, second] = sorted;
  if (second && second.votes === leader.votes) return null;
  return { leaderLabel: leader.label, leaderVotes: leader.votes, otherVotes: poll.totalVotes - leader.votes };
}

export function votePercent(votes: number, total: number): number {
  return total > 0 ? Math.round((votes / total) * 100) : 0;
}

export function initialsOf(nickname: string): string {
  const parts = nickname.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toLocaleUpperCase("bg");
}

/**
 * Viewer identity for optimistic updates: the full attendee row when the list is
 * visible, otherwise a minimal summary from /api/me.
 */
export function viewerSummary(
  me: { id: string; nickname: string } | undefined,
  attendees: readonly AttendeeDTO[] | undefined,
): UserSummary | null {
  if (!me) return null;
  const row = attendees?.find((a) => a.id === me.id);
  if (row) {
    const { id, nickname, avatarInitials, avatarColor, avatarUrl, roleId } = row;
    return { id, nickname, avatarInitials, avatarColor, avatarUrl, roleId };
  }
  return { id: me.id, nickname: me.nickname, avatarInitials: initialsOf(me.nickname), avatarColor: "#1C4532", avatarUrl: null, roleId: null };
}

/** True for an HTTP 404 from lib/api/client (ApiError), checked by shape. */
export function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { status?: unknown }).status === 404;
}

/** "YYYY-MM-DDTHH:mm" in local time, for <input type="datetime-local">. */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
