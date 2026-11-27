import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicEvent } from "@hp1/shared";
import { createEventSchema, rsvpSchema, updateEventSchema } from "../../../packages/shared/src/schemas/events.ts";
import {
  applyOptimisticRsvp,
  decideStatus,
  defaultContributions,
  describeEventChange,
  hasFreeSeat,
  nextRsvpStatus,
  normalizeCreateEvent,
  rsvpSystemText,
  shouldNotifyOrganizer,
  takesSeat,
} from "../lib/events/rules.ts";

const future = new Date(Date.now() + 86_400_000).toISOString();

test("nextRsvpStatus: manual approval turns a new confirm into pending", () => {
  assert.equal(nextRsvpStatus(true, null, "confirmed"), "pending_approval");
  assert.equal(nextRsvpStatus(true, "maybe", "confirmed"), "pending_approval");
  assert.equal(nextRsvpStatus(true, "pending_approval", "confirmed"), "pending_approval");
  assert.equal(nextRsvpStatus(true, "confirmed", "confirmed"), "confirmed");
  assert.equal(nextRsvpStatus(true, null, "maybe"), "maybe");
  assert.equal(nextRsvpStatus(true, "confirmed", "declined"), "declined");
  assert.equal(nextRsvpStatus(false, null, "confirmed"), "confirmed");
});

test("capacity: organiser counts, already-confirmed takes no new seat", () => {
  assert.equal(takesSeat(null, "confirmed"), true);
  assert.equal(takesSeat("maybe", "confirmed"), true);
  assert.equal(takesSeat("confirmed", "confirmed"), false);
  assert.equal(takesSeat(null, "pending_approval"), false);
  assert.equal(hasFreeSeat(1, 2), true); // organiser + one free
  assert.equal(hasFreeSeat(2, 2), false);
});

test("organiser is notified once per request", () => {
  assert.equal(shouldNotifyOrganizer(null, "pending_approval"), true);
  assert.equal(shouldNotifyOrganizer("pending_approval", "pending_approval"), false);
  assert.equal(shouldNotifyOrganizer(null, "confirmed"), false);
});

test("decideStatus only acts on pending requests", () => {
  assert.equal(decideStatus("pending_approval", "approve"), "confirmed");
  assert.equal(decideStatus("pending_approval", "reject"), "declined");
  assert.equal(decideStatus("confirmed", "approve"), null);
  assert.equal(decideStatus(null, "reject"), null);
});

test("rsvp system texts match legacy", () => {
  assert.equal(rsvpSystemText("Иво", "confirmed"), "Иво потвърди. Събранието става сериозно.");
  assert.equal(rsvpSystemText("Иво", "confirmed", { lateMinutes: 15 }), "Иво пак е на 15 минути.");
  assert.match(rsvpSystemText("Иво", "declined"), /Ще обясня на следващото заседание/);
});

test("applyOptimisticRsvp moves counts between buckets", () => {
  const base = { manualApproval: false, myStatus: "maybe", counts: { confirmed: 2, maybe: 1, pending: 0 } } as PublicEvent;
  const out = applyOptimisticRsvp(base, "confirmed");
  assert.equal(out.myStatus, "confirmed");
  assert.deepEqual(out.counts, { confirmed: 3, maybe: 0, pending: 0 });
  const pending = applyOptimisticRsvp({ ...base, manualApproval: true, myStatus: null }, "confirmed");
  assert.equal(pending.myStatus, "pending_approval");
  assert.deepEqual(pending.counts, { confirmed: 2, maybe: 1, pending: 1 });
});

const validCreate = {
  title: "Петъчна маса",
  startsAt: future,
  city: "София",
  neighborhood: "Лозенец",
  venueType: "механа",
  maxAttendees: 6,
};

test("createEventSchema: validation", () => {
  assert.equal(createEventSchema.safeParse(validCreate).success, true);
  assert.equal(createEventSchema.safeParse({ ...validCreate, maxAttendees: 1 }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, maxAttendees: 51 }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, venueType: "бар" }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, startsAt: "2020-01-01T10:00:00Z" }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, friendsOnly: true }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, coverImageUrl: "/images/a.jpg" }).success, true);
  assert.equal(createEventSchema.safeParse({ ...validCreate, coverImageUrl: "https://x.bg/a.jpg" }).success, true);
  assert.equal(createEventSchema.safeParse({ ...validCreate, coverImageUrl: "http://x.bg/a.jpg" }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, coverImageUrl: "javascript:alert(1)" }).success, false);
  assert.equal(createEventSchema.safeParse({ ...validCreate, coverImageUrl: "/images/../secret" }).success, false);
});

test("normalizeCreateEvent: legacy defaults and server coords only", () => {
  const parsed = createEventSchema.parse({ ...validCreate, coords: [1, 2] });
  const v = normalizeCreateEvent(parsed, { lat: 42.67, lng: 23.32 });
  assert.equal(v.approxLat, 42.67);
  assert.equal(v.approxLng, 23.32);
  assert.equal(v.venueName, "механа в Лозенец");
  assert.equal(v.exactAddress, "София, кв. Лозенец (детайли в чата)");
  assert.match(v.coverImageUrl, /^\/images\//);
  assert.equal(v.friendsOnly, false);
  assert.equal(v.seasonalTheme, "classic");
  assert.equal(defaultContributions().length, 6);
});

test("updateEventSchema requires a change; rsvpSchema rejects pending_approval", () => {
  assert.equal(updateEventSchema.safeParse({}).success, false);
  assert.equal(updateEventSchema.safeParse({ venueName: "Механа Шопа" }).success, true);
  assert.equal(rsvpSchema.safeParse({ status: "pending_approval" }).success, false);
});

test("describeEventChange", () => {
  const before = {
    venueName: "Стара",
    exactAddress: "ул. 1",
    city: "София",
    neighborhood: "Лозенец",
    startsAt: new Date("2026-12-01T17:00:00Z"),
    description: "",
  };
  assert.equal(describeEventChange(before, { ...before }), null);
  const venue = describeEventChange(before, { ...before, venueName: "Нова" })!;
  assert.equal(venue.chatText, "Мястото е сменено на „Нова“. Никой да не тръгва по стария адрес!");
  assert.equal(venue.title, "Смяна на мястото!");
  assert.equal(venue.venueChanged, true);
  assert.deepEqual(venue.locationCard, { venueName: "Нова", neighborhood: "Лозенец", city: "София" });
  const time = describeEventChange(before, { ...before, startsAt: new Date("2026-12-01T18:00:00Z") })!;
  assert.equal(time.venueChanged, false);
  assert.equal(time.title, "Промяна в часа");
  assert.match(time.chatText, /20:00/); // Europe/Sofia is UTC+2 in December
});
