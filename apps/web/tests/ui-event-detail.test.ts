import assert from "node:assert/strict";
import { test } from "node:test";

import type { AttendeeDTO } from "@hp1/shared";

import {
  DELETED_USER,
  canAccessPrivate,
  cleanPollOptions,
  displayName,
  freeSeats,
  groupAttendees,
  hasQuorum,
  initialsOf,
  inviteUrl,
  isNotFoundError,
  pollVerdict,
  roleTitle,
  rsvpConfirmLabel,
  shareableUrl,
  stickerText,
  viewerSummary,
  votePercent,
} from "../components/event-detail/helpers.ts";

const att = (id: string, status: AttendeeDTO["status"], extra: Partial<AttendeeDTO> = {}): AttendeeDTO => ({
  id,
  nickname: `user-${id}`,
  avatarInitials: "UU",
  avatarColor: "#123456",
  avatarUrl: null,
  roleId: "philosopher",
  status,
  isOrganizer: false,
  nonAlcoholic: false,
  lateMinutes: null,
  excuse: null,
  joinedAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

test("canAccessPrivate: only exactAddress presence or organiser", () => {
  assert.equal(canAccessPrivate({ exactAddress: undefined, viewerIsOrganizer: false }), false);
  assert.equal(canAccessPrivate({ exactAddress: "", viewerIsOrganizer: false }), true);
  assert.equal(canAccessPrivate({ exactAddress: undefined, viewerIsOrganizer: true }), true);
});

test("freeSeats / hasQuorum", () => {
  assert.equal(freeSeats(3, 6), 3);
  assert.equal(freeSeats(8, 6), 0);
  assert.equal(hasQuorum({ counts: { confirmed: 3, maybe: 0, pending: 0 }, isCancelled: false }), true);
  assert.equal(hasQuorum({ counts: { confirmed: 2, maybe: 0, pending: 0 }, isCancelled: false }), false);
  assert.equal(hasQuorum({ counts: { confirmed: 5, maybe: 0, pending: 0 }, isCancelled: true }), false);
});

test("groupAttendees splits by status; undefined list is empty", () => {
  const g = groupAttendees([att("a", "confirmed"), att("b", "maybe"), att("c", "declined"), att("d", "pending_approval")]);
  assert.deepEqual(
    [g.confirmed, g.maybe, g.declined, g.pending].map((l) => l.map((a) => a.id)),
    [["a"], ["b"], ["c"], ["d"]],
  );
  assert.equal(groupAttendees(undefined).confirmed.length, 0);
});

test("roleTitle / displayName / stickerText", () => {
  assert.equal(roleTitle("philosopher"), "Философът");
  assert.equal(roleTitle("nope"), null);
  assert.equal(roleTitle(null), null);
  assert.equal(displayName(null), DELETED_USER);
  assert.equal(displayName({ nickname: "Пешо" }), "Пешо");
  assert.equal(stickerText("clink"), "🥂 Наздраве!");
  assert.equal(stickerText("gone"), null);
  assert.equal(stickerText(null), null);
});

test("inviteUrl / shareableUrl", () => {
  assert.equal(inviteUrl("https://x.bg", "e1", "AbC_12-xyz"), "https://x.bg/events/e1?invite=AbC_12-xyz");
  const base = { id: "e1", isPrivate: false, friendsOnly: false };
  assert.equal(shareableUrl("https://x.bg", { ...base, inviteCode: "CODE123456" }), "https://x.bg/events/e1?invite=CODE123456");
  assert.equal(shareableUrl("https://x.bg", base), "https://x.bg/events/e1");
  assert.equal(shareableUrl("https://x.bg", { ...base, isPrivate: true }), null);
  assert.equal(shareableUrl("https://x.bg", { ...base, friendsOnly: true }), null);
});

test("rsvpConfirmLabel", () => {
  assert.equal(rsvpConfirmLabel(null, false), "Идвам!");
  assert.equal(rsvpConfirmLabel(null, true), "Заяви участие");
  assert.equal(rsvpConfirmLabel("pending_approval", true), "Заявката чака одобрение");
  assert.equal(rsvpConfirmLabel("confirmed", true), "Идвам! (Потвърдено ✓)");
});

test("cleanPollOptions trims, drops blanks, checks 2..6 and duplicates", () => {
  assert.deepEqual(cleanPollOptions([" Да ", "Не", ""]), { ok: true, options: ["Да", "Не"] });
  assert.equal(cleanPollOptions(["Да", "  "]).ok, false);
  assert.equal(cleanPollOptions(["Да", "да"]).ok, false);
  assert.equal(cleanPollOptions(["1", "2", "3", "4", "5", "6", "7"]).ok, false);
});

test("pollVerdict and votePercent", () => {
  const opt = (label: string, votes: number) => ({ id: label, label, votes, mine: false });
  assert.equal(pollVerdict({ options: [opt("a", 0), opt("b", 0)], totalVotes: 0 }), null);
  assert.equal(pollVerdict({ options: [opt("a", 2), opt("b", 2)], totalVotes: 4 }), null);
  assert.deepEqual(pollVerdict({ options: [opt("a", 1), opt("b", 3), opt("c", 1)], totalVotes: 5 }), {
    leaderLabel: "b",
    leaderVotes: 3,
    otherVotes: 2,
  });
  assert.equal(votePercent(1, 3), 33);
  assert.equal(votePercent(0, 0), 0);
});

test("initialsOf / viewerSummary / isNotFoundError", () => {
  assert.equal(initialsOf("бай Иван"), "БИ");
  assert.equal(initialsOf("пешо"), "ПЕ");
  assert.equal(viewerSummary(undefined, undefined), null);
  const row = att("me", "confirmed", { nickname: "Аз" });
  assert.deepEqual(viewerSummary({ id: "me", nickname: "Аз" }, [row]), {
    id: "me",
    nickname: "Аз",
    avatarInitials: "UU",
    avatarColor: "#123456",
    avatarUrl: null,
    roleId: "philosopher",
  });
  assert.equal(viewerSummary({ id: "me", nickname: "Аз" }, undefined)?.avatarInitials, "АЗ");
  assert.equal(isNotFoundError({ status: 404 }), true);
  assert.equal(isNotFoundError({ status: 403 }), false);
  assert.equal(isNotFoundError(new Error("x")), false);
});
