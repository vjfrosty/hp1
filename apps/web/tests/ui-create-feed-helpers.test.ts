import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicEvent } from "@hp1/shared";

import { coverFor, freeSeats, hasQuorum, whenLabel } from "../components/events/formatEvent.ts";
import { DEFAULT_FILTERS, filterEvents } from "../components/feed/filters.ts";
import { approxDistanceKm } from "../components/radar/distance.ts";

// 2026-11-26 is a Thursday; Sofia is UTC+2.
const now = new Date("2026-11-26T10:00:00Z");

function ev(over: Partial<PublicEvent>): PublicEvent {
  return {
    id: "e1",
    title: "Петъчна комисия",
    description: "Шопска и разговори",
    startsAt: "2026-11-26T17:30:00Z",
    city: "София",
    neighborhood: "Лозенец",
    venueName: "Под липите",
    venueType: "механа",
    coords: [42.6776, 23.3248],
    maxAttendees: 6,
    isPrivate: false,
    manualApproval: false,
    friendsOnly: false,
    plannedFood: "сирене",
    nonAlcoholicFriendly: true,
    seasonalTheme: "classic",
    coverImageUrl: null,
    groupId: null,
    isCancelled: false,
    organizer: { id: "u1", nickname: "Петър", avatarInitials: "П", avatarColor: "#1C4532", avatarUrl: null, roleId: null },
    counts: { confirmed: 2, maybe: 0, pending: 0 },
    myStatus: null,
    viewerIsOrganizer: false,
    ...over,
  };
}

test("filterEvents applies date, venue, seats, non-alcoholic and search", () => {
  const today = ev({ id: "a" });
  const tomorrowYard = ev({ id: "b", startsAt: "2026-11-27T21:00:00Z", venueType: "двор", nonAlcoholicFriendly: false });
  const full = ev({ id: "c", counts: { confirmed: 6, maybe: 0, pending: 0 } });
  const priv = ev({ id: "d", isPrivate: true, title: "Тайна вила" });
  const all = [today, tomorrowYard, full, priv];
  const ids = (f: Partial<typeof DEFAULT_FILTERS>) => filterEvents(all, { ...DEFAULT_FILTERS, ...f }, now).map((e) => e.id);

  assert.deepEqual(ids({}), ["a", "b", "c", "d"]);
  assert.deepEqual(ids({ date: "утре" }), ["b"]);
  assert.deepEqual(ids({ venue: "двор" }), ["b"]);
  assert.deepEqual(ids({ onlyWithSeats: true }), ["a", "b", "d"]);
  assert.deepEqual(ids({ onlyNonAlcoholic: true }), ["a", "c", "d"]);
  assert.deepEqual(ids({ visibility: "публични" }), ["a", "b", "c"]);
  assert.deepEqual(ids({ visibility: "приятели" }), ["d"]);
  assert.deepEqual(ids({ search: "вила" }), ["d"]);
  assert.deepEqual(ids({ time: "късно" }), ["b"]); // 23:00 Sofia
  assert.deepEqual(ids({ time: "вечер" }), ["a", "c", "d"]); // 19:30 Sofia
});

test("event formatting helpers", () => {
  assert.equal(whenLabel("2026-11-26T17:30:00Z", now), "днес, 19:30");
  assert.equal(whenLabel("2026-11-27T18:00:00Z", now), "утре, 20:00");
  assert.equal(freeSeats(ev({ counts: { confirmed: 8, maybe: 0, pending: 0 } })), 0);
  assert.equal(hasQuorum(ev({ counts: { confirmed: 3, maybe: 0, pending: 0 } })), true);
  assert.equal(hasQuorum(ev({ counts: { confirmed: 3, maybe: 0, pending: 0 }, isCancelled: true })), false);
  assert.equal(coverFor(ev({ venueType: "вила" })), "/images/gathering_villa_fire_1795110106084.jpg");
  assert.equal(coverFor(ev({ coverImageUrl: "/images/x.jpg" })), "/images/x.jpg");
});

test("approxDistanceKm between Sofia districts", () => {
  const d = approxDistanceKm([42.6776, 23.3248], [42.6525, 23.3742]);
  assert.ok(d > 4 && d < 6, `got ${d}`);
});
