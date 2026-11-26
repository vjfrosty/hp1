import assert from "node:assert/strict";
import { test } from "node:test";

import { districtPoint } from "../../../packages/shared/src/geo.ts";

test("districtPoint returns the neighbourhood centre, not client input", () => {
  assert.deepEqual(districtPoint("София", "Лозенец"), { lat: 42.6776, lng: 23.3248 });
});

test("districtPoint falls back to the city centre for an unknown neighbourhood", () => {
  assert.deepEqual(districtPoint("София", "Несъществуващ"), { lat: 42.6977, lng: 23.3219 });
});

test("districtPoint returns null for an unknown city", () => {
  assert.equal(districtPoint("Атлантида"), null);
});
