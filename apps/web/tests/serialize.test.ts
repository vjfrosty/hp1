import assert from "node:assert/strict";
import { test } from "node:test";

import { canViewEvent, type ViewerContext } from "../lib/events/access.ts";
import { toPublicEvent, type AttendeeRowLike, type EventRowLike } from "../lib/events/serialize.ts";

const ORG = "00000000-0000-0000-0000-00000000000a";
const event: EventRowLike = {
  id: "e1", organizerId: ORG, groupId: null, title: "Сбирка", description: "", startsAt: new Date("2026-12-01T18:00:00Z"),
  city: "София", neighborhood: "Лозенец", venueName: "У дома", exactAddress: "ул. Тайна 7, ет. 3", venueType: "домашна маса",
  approxLat: 42.6776, approxLng: 23.3248, maxAttendees: 6, isPrivate: false, manualApproval: true, friendsOnly: false,
  plannedFood: "", nonAlcoholicFriendly: true, seasonalTheme: "classic", coverImageUrl: null, inviteCode: "SECRETcode12", cancelledAt: null,
};
const user = (id: string) => ({ id, nickname: id, avatarInitials: "", avatarColor: "", avatarUrl: null, roleId: null });
const att = (id: string, status: AttendeeRowLike["status"], isOrganizer = false): AttendeeRowLike => ({
  ...user(id), status, isOrganizer, nonAlcoholic: false, lateMinutes: null, excuse: null, joinedAt: new Date(),
});
const attendees = [att(ORG, "confirmed", true), att("ok", "confirmed"), att("wait", "pending_approval"), att("may", "maybe")];

test("pending, maybe and stranger never receive exact_address, attendee list or invite code", () => {
  for (const viewer of ["wait", "may", "stranger"]) {
    const out = toPublicEvent(event, user(ORG), attendees, viewer);
    assert.equal(out.exactAddress, undefined, viewer);
    assert.equal(out.attendees, undefined, viewer);
    assert.equal(out.inviteCode, undefined, viewer);
    assert.ok(!JSON.stringify(out).includes("Тайна"), `${viewer} payload leaks the address`);
    assert.ok(!JSON.stringify(out).includes("SECRETcode12"), `${viewer} payload leaks the invite code`);
  }
});

test("confirmed attendee gets address and list, not invite code", () => {
  const out = toPublicEvent(event, user(ORG), attendees, "ok");
  assert.equal(out.exactAddress, event.exactAddress);
  assert.equal(out.attendees?.length, 4);
  assert.equal(out.inviteCode, undefined);
});

test("organiser gets everything", () => {
  const out = toPublicEvent(event, user(ORG), attendees, ORG);
  assert.equal(out.exactAddress, event.exactAddress);
  assert.equal(out.inviteCode, "SECRETcode12");
  assert.equal(out.viewerIsOrganizer, true);
});

test("counts and myStatus", () => {
  const out = toPublicEvent(event, user(ORG), attendees, "wait");
  assert.deepEqual(out.counts, { confirmed: 2, maybe: 1, pending: 1 });
  assert.equal(out.myStatus, "pending_approval");
});

const ctx = (o: Partial<ViewerContext>): ViewerContext => ({
  viewerId: "v", organizerId: ORG, isPrivate: false, friendsOnly: false, myStatus: null, isGroupMember: false, viaInvite: false, blocked: false, ...o,
});

test("canViewEvent: privacy and blocks", () => {
  assert.equal(canViewEvent(ctx({})), true);
  assert.equal(canViewEvent(ctx({ isPrivate: true })), false);
  assert.equal(canViewEvent(ctx({ isPrivate: true, viaInvite: true })), true);
  assert.equal(canViewEvent(ctx({ friendsOnly: true })), false);
  assert.equal(canViewEvent(ctx({ friendsOnly: true, isGroupMember: true })), true);
  assert.equal(canViewEvent(ctx({ blocked: true })), false);
  assert.equal(canViewEvent(ctx({ blocked: true, viaInvite: true })), false);
  assert.equal(canViewEvent(ctx({ viewerId: ORG, blocked: true, isPrivate: true })), true);
});
