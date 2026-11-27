import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canViewChronicle,
  canViewWisdom,
  visibleTags,
  type ChronicleViewContext,
  type TagRowLike,
} from "../lib/community/visibility.ts";

const AUTHOR = "author";
const base: ChronicleViewContext = {
  viewerId: "viewer",
  authorId: AUTHOR,
  visibility: "friends",
  hidden: false,
  authorBlocked: false,
  isGroupMember: false,
  isTagged: false,
  attendedEvent: false,
};

test("public chronicle: anyone not blocked sees it", () => {
  assert.equal(canViewChronicle({ ...base, visibility: "public" }), true);
});

test("group chronicle: only members (and the author)", () => {
  assert.equal(canViewChronicle({ ...base, visibility: "group" }), false);
  assert.equal(canViewChronicle({ ...base, visibility: "group", isGroupMember: true }), true);
  assert.equal(canViewChronicle({ ...base, visibility: "group", viewerId: AUTHOR }), true);
  // Being tagged does not open a group-only entry.
  assert.equal(canViewChronicle({ ...base, visibility: "group", isTagged: true }), false);
});

test("friends chronicle: author, tagged, or event attendee", () => {
  assert.equal(canViewChronicle(base), false);
  assert.equal(canViewChronicle({ ...base, isGroupMember: true }), false);
  assert.equal(canViewChronicle({ ...base, isTagged: true }), true);
  assert.equal(canViewChronicle({ ...base, attendedEvent: true }), true);
  assert.equal(canViewChronicle({ ...base, viewerId: AUTHOR }), true);
});

test("hidden and blocked authors are never visible", () => {
  assert.equal(canViewChronicle({ ...base, visibility: "public", hidden: true }), false);
  assert.equal(canViewChronicle({ ...base, visibility: "public", authorBlocked: true }), false);
  assert.equal(canViewChronicle({ ...base, viewerId: AUTHOR, hidden: true }), false);
});

test("deleted author (null) never matches a viewer", () => {
  assert.equal(canViewChronicle({ ...base, authorId: null, viewerId: "x" }), false);
  assert.equal(canViewChronicle({ ...base, authorId: null, visibility: "public" }), true);
});

const tag = (id: string, consented: boolean): TagRowLike => ({
  id,
  nickname: `nick-${id}`,
  avatarInitials: "",
  avatarColor: "",
  avatarUrl: null,
  roleId: null,
  consentGivenAt: consented ? new Date("2026-11-27T10:00:00Z") : null,
});
const tags = [tag("yes", true), tag("wait", false)];

test("non-authors see only consented tags", () => {
  for (const viewer of ["stranger", "wait", "yes"]) {
    const out = visibleTags(tags, viewer, AUTHOR);
    assert.deepEqual(
      out.map((t) => t.id),
      ["yes"],
      viewer,
    );
    assert.ok(!JSON.stringify(out).includes("nick-wait"), `${viewer} payload leaks a pending tag`);
    assert.equal(out[0].pending, false);
  }
});

test("the author also sees pending tags, marked pending", () => {
  const out = visibleTags(tags, AUTHOR, AUTHOR);
  assert.deepEqual(
    out.map((t) => [t.id, t.pending]),
    [
      ["yes", false],
      ["wait", true],
    ],
  );
  assert.ok(!("consentGivenAt" in out[0]), "raw consent timestamp is not in the DTO");
});

test("deleted author: nobody gets pending tags", () => {
  assert.deepEqual(
    visibleTags(tags, "anyone", null).map((t) => t.id),
    ["yes"],
  );
});

test("wisdom: author, quoted person, or members of the group it was shared to", () => {
  const w = {
    viewerId: "v",
    authorId: "a",
    quotedUserId: null,
    sharedToGroup: false,
    groupId: "g",
    isGroupMember: true,
    blocked: false,
  };
  assert.equal(canViewWisdom(w), false, "unshared wisdom stays with the author");
  assert.equal(canViewWisdom({ ...w, viewerId: "a" }), true);
  assert.equal(canViewWisdom({ ...w, sharedToGroup: true }), true);
  assert.equal(canViewWisdom({ ...w, sharedToGroup: true, isGroupMember: false }), false);
  assert.equal(canViewWisdom({ ...w, sharedToGroup: true, groupId: null }), false);
  assert.equal(canViewWisdom({ ...w, quotedUserId: "v" }), true);
  assert.equal(canViewWisdom({ ...w, sharedToGroup: true, blocked: true }), false);
});
