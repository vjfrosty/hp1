import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createChronicleSchema,
  createWisdomSchema,
  profilePatchSchema,
} from "../../../packages/shared/src/schemas/community.ts";
import { buildProfileUpdate, initialsOf } from "../lib/community/profile.ts";
import { quorumNotification, quorumReachedNow } from "../lib/community/quorum.ts";

// ─── quorum ──────────────────────────────────────────────────────────────────

test("quorum is reached only on the vote that crosses the threshold", () => {
  assert.equal(quorumReachedNow(2, 3, 3), true);
  assert.equal(quorumReachedNow(1, 2, 3), false);
  assert.equal(quorumReachedNow(3, 4, 3), false, "already reached");
  assert.equal(quorumReachedNow(3, 2, 3), false, "removing a vote");
  assert.equal(quorumReachedNow(4, 3, 3), false, "removing a vote above quorum");
  assert.equal(quorumReachedNow(0, 1, 1), true);
});

test("quorum notification ports the legacy texts with Sofia time", () => {
  // 17:30 UTC is 19:30 in Sofia in winter.
  const n = quorumNotification("Петъчен съвет", "Петък вечер", "2026-12-04T17:30:00Z");
  assert.equal(n.title, "Кворумът е събран!");
  assert.equal(n.body, "Общият удобен час за Петъчен съвет: Петък вечер (19:30) вече има достатъчно гласове.");
});

// ─── profile ─────────────────────────────────────────────────────────────────

const current = { city: "София", neighborhood: "Лозенец" };

test("profile schema strips privileged fields", () => {
  const parsed = profilePatchSchema.parse({
    nickname: "  Бай Иван ",
    earnedBadges: ["all"],
    ageConfirmedAt: "2000-01-01",
    isAdmin: true,
    id: "x",
    avatarInitials: "ZZ",
  });
  assert.deepEqual(Object.keys(parsed), ["nickname"]);
  const out = buildProfileUpdate(parsed, current);
  assert.ok(out.ok);
  assert.deepEqual(out.set, { nickname: "Бай Иван", avatarInitials: "БИ" });
});

test("buildProfileUpdate ignores unknown keys even without zod", () => {
  const out = buildProfileUpdate({ radarActive: true, earnedBadges: ["x"] } as never, current);
  assert.ok(out.ok);
  assert.deepEqual(out.set, { radarActive: true });
});

test("profile schema enforces limits and allow-lists", () => {
  assert.equal(profilePatchSchema.safeParse({ nickname: "A" }).success, false);
  assert.equal(profilePatchSchema.safeParse({ nickname: "x".repeat(41) }).success, false);
  assert.equal(profilePatchSchema.safeParse({ radarRadiusKm: 0 }).success, false);
  assert.equal(profilePatchSchema.safeParse({ radarRadiusKm: 51 }).success, false);
  assert.equal(profilePatchSchema.safeParse({ radarRadiusKm: 2.5 }).success, false);
  assert.equal(profilePatchSchema.safeParse({ radarMessage: "x".repeat(141) }).success, false);
  assert.equal(profilePatchSchema.safeParse({ roleId: "admin" }).success, false);
  assert.equal(profilePatchSchema.safeParse({ interests: ["Хакване"] }).success, false);
  assert.equal(profilePatchSchema.safeParse({ preferredVenues: Array(11).fill("механа") }).success, false);
  assert.equal(profilePatchSchema.safeParse({ city: "Атлантида" }).success, false);
  const ok = profilePatchSchema.parse({ preferredVenues: ["механа", "механа", "двор"], roleId: "grill_master" });
  assert.deepEqual(ok.preferredVenues, ["механа", "двор"]);
});

test("neighbourhood must belong to the resulting city", () => {
  const bad = buildProfileUpdate({ neighborhood: "Несъществуващ" }, current);
  assert.equal(bad.ok, false);
  const good = buildProfileUpdate({ neighborhood: "Оборище" }, current);
  assert.ok(good.ok);
  assert.deepEqual(good.set, { neighborhood: "Оборище" });
});

test("changing city clears a neighbourhood that no longer fits", () => {
  const out = buildProfileUpdate({ city: "Пловдив" }, current);
  assert.ok(out.ok);
  assert.deepEqual(out.set, { city: "Пловдив", neighborhood: null });
});

test("empty radar message is stored as null", () => {
  const out = buildProfileUpdate({ radarMessage: "   " }, current);
  assert.ok(out.ok);
  assert.deepEqual(out.set, { radarMessage: null });
});

test("initials: first letters of the first two words", () => {
  assert.equal(initialsOf("бай иван петров"), "БИ");
  assert.equal(initialsOf("Гошо"), "Г");
});

// ─── chronicle & wisdom consent ──────────────────────────────────────────────

const chronicle = { city: "София", visibility: "friends" as const };

test("chronicle with a photo or tags needs consentConfirmed", () => {
  const tagged = { ...chronicle, taggedUserIds: ["00000000-0000-4000-8000-000000000001"] };
  assert.equal(createChronicleSchema.safeParse(tagged).success, false);
  assert.equal(createChronicleSchema.safeParse({ ...tagged, consentConfirmed: true }).success, true);
  const photo = { ...chronicle, photoUrl: "https://example.com/a.jpg" };
  assert.equal(createChronicleSchema.safeParse(photo).success, false);
  assert.equal(createChronicleSchema.safeParse({ ...chronicle }).success, true);
});

test("chronicle rejects non-https photos and group visibility without a group", () => {
  assert.equal(
    createChronicleSchema.safeParse({ ...chronicle, consentConfirmed: true, photoUrl: "javascript:alert(1)" }).success,
    false,
  );
  assert.equal(createChronicleSchema.safeParse({ ...chronicle, visibility: "group" }).success, false);
});

test("quoting someone is allowed without author-asserted consent; sharing needs a group", () => {
  const q = { quote: "Мезето е по-важно от ракията." };
  assert.equal(createWisdomSchema.safeParse(q).success, true);
  const quoted = { ...q, quotedUserId: "00000000-0000-4000-8000-000000000001" };
  // Consent comes from the quoted person via /api/wisdom/[id]/consent, so the
  // author's request no longer needs (or can grant) it.
  assert.equal(createWisdomSchema.safeParse(quoted).success, true);
  assert.equal(createWisdomSchema.safeParse({ ...q, sharedToGroup: true }).success, false);
  assert.equal(createWisdomSchema.safeParse({ ...q, quote: "x".repeat(281) }).success, false);
});
