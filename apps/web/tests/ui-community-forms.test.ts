import assert from "node:assert/strict";
import { test } from "node:test";

import type { ProfileDTO, WisdomDTO } from "../../../packages/shared/src/index.ts";
import { createChronicleSchema, createQuorumSlotSchema, createWisdomSchema, profilePatchSchema } from "../../../packages/shared/src/index.ts";
import {
  buildChronicleInput,
  buildWisdomInput,
  isHttpsUrl,
  wisdomNeedsMyConsent,
  wisdomPending,
  type ChronicleFormState,
} from "../components/chronicle/chronicle-form.ts";
import {
  quorumSlotTimeError,
  slotDayLabel,
  sofiaDatePlusDays,
  sofiaLocalToIso,
  sofiaOffsetMinutes,
  sofiaToday,
} from "../components/groups/quorum-time.ts";
import { formFromProfile, neighborhoodsFor, profileFormError, profilePatch, toggleIn } from "../components/profile/profile-form.ts";

// ─── quorum time ─────────────────────────────────────────────────────────────

test("sofiaOffsetMinutes: winter +120, summer +180", () => {
  assert.equal(sofiaOffsetMinutes(new Date("2026-01-15T12:00:00Z")), 120);
  assert.equal(sofiaOffsetMinutes(new Date("2026-07-15T12:00:00Z")), 180);
});

test("sofiaLocalToIso converts Sofia wall clock to ISO with offset", () => {
  assert.equal(sofiaLocalToIso("2026-11-28", "19:30"), "2026-11-28T19:30:00+02:00");
  assert.equal(sofiaLocalToIso("2026-07-03", "21:00"), "2026-07-03T21:00:00+03:00");
  assert.equal(new Date(sofiaLocalToIso("2026-11-28", "19:30")!).toISOString(), "2026-11-28T17:30:00.000Z");
  assert.equal(new Date(sofiaLocalToIso("2026-07-03", "00:15")!).toISOString(), "2026-07-02T21:15:00.000Z");
  // The result passes the server schema.
  assert.ok(createQuorumSlotSchema.safeParse({ label: "Петък", startsAt: sofiaLocalToIso("2026-11-28", "19:30") }).success);
});

test("sofiaLocalToIso around DST switches", () => {
  // 2027-03-28: 03:00 -> 04:00. Before and after the switch.
  assert.equal(sofiaLocalToIso("2027-03-28", "02:30"), "2027-03-28T02:30:00+02:00");
  assert.equal(sofiaLocalToIso("2027-03-28", "05:00"), "2027-03-28T05:00:00+03:00");
  // Nonexistent 03:30 resolves to a real instant.
  const gap = sofiaLocalToIso("2027-03-28", "03:30");
  assert.ok(gap && !Number.isNaN(new Date(gap).getTime()));
  // 2026-10-25: 04:00 -> 03:00.
  assert.equal(sofiaLocalToIso("2026-10-25", "12:00"), "2026-10-25T12:00:00+02:00");
});

test("sofiaLocalToIso rejects malformed input", () => {
  assert.equal(sofiaLocalToIso("", "19:00"), null);
  assert.equal(sofiaLocalToIso("2026-02-30", "19:00"), null);
  assert.equal(sofiaLocalToIso("2026-11-28", "25:00"), null);
  assert.equal(sofiaLocalToIso("28.11.2026", "19:00"), null);
});

test("quorumSlotTimeError: future and at most 180 days", () => {
  const now = new Date("2026-11-27T10:00:00Z");
  assert.equal(quorumSlotTimeError("2026-11-27T13:00:00+02:00", now), null);
  assert.equal(quorumSlotTimeError("2026-11-27T11:00:00+02:00", now), "Часът трябва да е в бъдещето.");
  assert.equal(quorumSlotTimeError(sofiaLocalToIso("2027-06-30", "19:00"), now), "Най-много 180 дни напред.");
  assert.equal(quorumSlotTimeError(null, now), "Избери дата и час.");
});

test("sofiaToday / sofiaDatePlusDays / slotDayLabel", () => {
  assert.equal(sofiaToday(new Date("2026-11-27T22:30:00Z")), "2026-11-28");
  assert.equal(sofiaDatePlusDays(1, new Date("2026-11-27T10:00:00Z")), "2026-11-28");
  assert.match(slotDayLabel("2026-11-28T17:30:00Z"), /28/);
});

// ─── chronicle ───────────────────────────────────────────────────────────────

const UUID = "4b8f9f3e-2c1a-4f5e-9a7b-1c2d3e4f5a6b";
const baseChronicle: ChronicleFormState = {
  title: " Петъчна маса ",
  eventId: "",
  groupId: "",
  city: "София",
  officialDecision: "Решихме въпроса с паркирането.",
  story: "",
  photoUrl: "",
  visibility: "friends",
  consentConfirmed: false,
  taggedUserIds: [],
};

test("buildChronicleInput: plain entry needs no consent and passes the schema", () => {
  const r = buildChronicleInput(baseChronicle);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.input.title, "Петъчна маса");
  assert.equal(r.input.eventId, null);
  assert.ok(createChronicleSchema.safeParse(r.input).success);
});

test("buildChronicleInput: photo or tags require consent", () => {
  const withTag = { ...baseChronicle, taggedUserIds: [UUID] };
  assert.equal(buildChronicleInput(withTag).ok, false);
  const ok = buildChronicleInput({ ...withTag, consentConfirmed: true });
  assert.ok(ok.ok && createChronicleSchema.safeParse(ok.input).success);
  assert.equal(buildChronicleInput({ ...baseChronicle, photoUrl: "https://x.bg/a.jpg" }).ok, false);
});

test("buildChronicleInput: https photos only, group visibility needs a group, needs content", () => {
  const http = buildChronicleInput({ ...baseChronicle, photoUrl: "http://x.bg/a.jpg", consentConfirmed: true });
  assert.deepEqual(http, { ok: false, error: "Снимката трябва да е https:// адрес." });
  assert.equal(buildChronicleInput({ ...baseChronicle, visibility: "group" }).ok, false);
  const grp = buildChronicleInput({ ...baseChronicle, visibility: "group", groupId: UUID });
  assert.ok(grp.ok && createChronicleSchema.safeParse(grp.input).success);
  assert.equal(buildChronicleInput({ ...baseChronicle, officialDecision: " ", story: "" }).ok, false);
  assert.equal(isHttpsUrl("https://a.bg"), true);
  assert.equal(isHttpsUrl("javascript:alert(1)"), false);
});

// ─── wisdom ──────────────────────────────────────────────────────────────────

test("buildWisdomInput: quoting someone never claims their consent", () => {
  const r = buildWisdomInput({ quote: " Наздраве! ", context: "", groupId: UUID, quotedUserId: UUID });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.input.quote, "Наздраве!");
  assert.equal(r.input.consentGiven, false);
  assert.equal(r.input.sharedToGroup, true);
  assert.ok(createWisdomSchema.safeParse(r.input).success);
  const priv = buildWisdomInput({ quote: "x", context: "", groupId: "", quotedUserId: "" });
  assert.ok(priv.ok && priv.input.sharedToGroup === false && priv.input.groupId === null);
  assert.equal(buildWisdomInput({ quote: "  ", context: "", groupId: "", quotedUserId: "" }).ok, false);
});

const person = (id: string) => ({ id, nickname: id, avatarInitials: "AA", avatarColor: "#000", avatarUrl: null, roleId: null });
const wisdomRow = (over: Partial<WisdomDTO>): WisdomDTO => ({
  id: "w1",
  quote: "q",
  context: "",
  author: person("author"),
  quotedUser: person("quoted"),
  consentGiven: false,
  sharedToGroup: false,
  groupId: null,
  groupName: null,
  viewerIsAuthor: false,
  createdAt: "2026-11-27T10:00:00Z",
  ...over,
});

test("wisdom pending and consent prompt", () => {
  assert.equal(wisdomPending(wisdomRow({})), true);
  assert.equal(wisdomPending(wisdomRow({ consentGiven: true })), false);
  assert.equal(wisdomPending(wisdomRow({ quotedUser: null })), false);
  assert.equal(wisdomPending(wisdomRow({ quotedUser: person("author") })), false);
  assert.equal(wisdomNeedsMyConsent(wisdomRow({}), "quoted"), true);
  assert.equal(wisdomNeedsMyConsent(wisdomRow({}), "someone"), false);
  assert.equal(wisdomNeedsMyConsent(wisdomRow({ viewerIsAuthor: true }), "quoted"), false);
  assert.equal(wisdomNeedsMyConsent(wisdomRow({}), undefined), false);
});

// ─── profile ─────────────────────────────────────────────────────────────────

const profile: ProfileDTO = {
  id: UUID,
  nickname: "Пешо",
  avatarInitials: "ПЕ",
  avatarColor: "#1C4532",
  avatarUrl: null,
  city: "София",
  neighborhood: "Лозенец",
  usualAvailability: null,
  companySize: "4–6 души",
  roleId: "philosopher",
  preferredVenues: ["механа"],
  favoriteMeze: [],
  interests: [],
  earnedBadges: ["organizer_5"],
  nonAlcoholicPreferred: false,
  radarActive: false,
  radarRadiusKm: 5,
  radarMessage: null,
  ageConfirmed: true,
  createdAt: "2026-01-01T00:00:00Z",
};

test("profilePatch sends only changed, allow-listed fields", () => {
  const form = formFromProfile(profile);
  assert.deepEqual(profilePatch(profile, form), {});
  const changed = profilePatch(profile, { ...form, nickname: " Петър ", radarActive: true, preferredVenues: ["механа"] });
  assert.deepEqual(changed, { nickname: "Петър", radarActive: true });
  assert.equal("earnedBadges" in changed, false);
  assert.ok(profilePatchSchema.safeParse(changed).success);
});

test("profilePatch sends the neighbourhood with a city change", () => {
  const form = formFromProfile(profile);
  const hood = neighborhoodsFor("Пловдив")[0];
  assert.ok(hood);
  assert.deepEqual(profilePatch(profile, { ...form, city: "Пловдив", neighborhood: hood }), { city: "Пловдив", neighborhood: hood });
  assert.deepEqual(profilePatch(profile, { ...form, radarMessage: "  " }), {});
});

test("profileFormError mirrors server limits", () => {
  const form = formFromProfile(profile);
  assert.equal(profileFormError(form), null);
  assert.ok(profileFormError({ ...form, nickname: "П" }));
  assert.ok(profileFormError({ ...form, radarRadiusKm: 51 }));
  assert.ok(profileFormError({ ...form, city: "Пловдив", neighborhood: "Лозенец" }));
  assert.deepEqual(toggleIn(["a", "b"], "a"), ["b"]);
  assert.deepEqual(toggleIn(["a"], "b"), ["a", "b"]);
});
