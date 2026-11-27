import assert from "node:assert/strict";
import { test } from "node:test";

import { sofiaLocalToIso } from "../components/create-event/sofiaLocalToIso.ts";

test("winter time is UTC+2", () => {
  const iso = sofiaLocalToIso("2026-12-01", "19:30");
  assert.equal(iso, "2026-12-01T19:30:00+02:00");
  assert.equal(new Date(iso!).toISOString(), "2026-12-01T17:30:00.000Z");
});

test("summer time is UTC+3", () => {
  const iso = sofiaLocalToIso("2027-07-15", "21:00");
  assert.equal(iso, "2027-07-15T21:00:00+03:00");
  assert.equal(new Date(iso!).toISOString(), "2027-07-15T18:00:00.000Z");
});

test("midnight keeps the local date", () => {
  assert.equal(new Date(sofiaLocalToIso("2027-01-01", "00:15")!).toISOString(), "2026-12-31T22:15:00.000Z");
});

test("DST edges", () => {
  // 2027-03-28: clocks jump 03:00 -> 04:00. 03:30 does not exist; it moves forward.
  assert.equal(sofiaLocalToIso("2027-03-28", "02:30"), "2027-03-28T02:30:00+02:00");
  assert.equal(sofiaLocalToIso("2027-03-28", "03:30"), "2027-03-28T04:30:00+03:00");
  assert.equal(sofiaLocalToIso("2027-03-28", "04:30"), "2027-03-28T04:30:00+03:00");
  // 2027-10-31: clocks fall back 04:00 -> 03:00; the day after is +02:00.
  assert.equal(sofiaLocalToIso("2027-10-31", "12:00"), "2027-10-31T12:00:00+02:00");
  assert.equal(sofiaLocalToIso("2027-10-30", "12:00"), "2027-10-30T12:00:00+03:00");
});

test("rejects malformed input", () => {
  assert.equal(sofiaLocalToIso("", "19:00"), null);
  assert.equal(sofiaLocalToIso("2026-12-01", ""), null);
  assert.equal(sofiaLocalToIso("2026-02-31", "19:00"), null);
  assert.equal(sofiaLocalToIso("2026-12-01", "25:00"), null);
});
