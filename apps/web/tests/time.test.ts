import assert from "node:assert/strict";
import { test } from "node:test";

import { dateLabel, sofiaTime, timeBucket } from "../../../packages/shared/src/time.ts";

// 2026-11-26 is a Thursday. Sofia is UTC+2 in winter.
const now = new Date("2026-11-26T10:00:00Z");

test("dateLabel in Europe/Sofia", () => {
  assert.equal(dateLabel("2026-11-26T19:00:00Z", now), "днес");
  assert.equal(dateLabel("2026-11-26T22:30:00Z", now), "утре"); // 00:30 Sofia next day
  assert.equal(dateLabel("2026-11-28T17:00:00Z", now), "уикенда");
  assert.equal(dateLabel("2026-12-05T17:00:00Z", now), "по-късно");
  assert.equal(dateLabel("2026-11-25T17:00:00Z", now), "минала");
});

test("timeBucket and sofiaTime", () => {
  assert.equal(timeBucket("2026-11-26T15:30:00Z"), "ранен вечер"); // 17:30
  assert.equal(timeBucket("2026-11-26T18:00:00Z"), "вечер"); // 20:00
  assert.equal(timeBucket("2026-11-26T21:00:00Z"), "късно"); // 23:00
  assert.equal(sofiaTime("2026-11-26T18:05:00Z"), "20:05");
});
