import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aggregateReactions,
  applyVote,
  nextContributionState,
  toggleReactionList,
  voteDecision,
} from "../lib/social/logic.ts";

const ME = "me";
const ORG = "org";
const OTHER = "other";

test("aggregateReactions: counts, mine, allow-list order, no user ids", () => {
  const rows = [
    { messageId: "m1", userId: OTHER, emoji: "🥂" },
    { messageId: "m1", userId: ME, emoji: "🥂" },
    { messageId: "m1", userId: OTHER, emoji: "👍" },
    { messageId: "m2", userId: OTHER, emoji: "😂" },
  ];
  const out = aggregateReactions(rows, ME, ["👍", "😂", "🥂"]);
  assert.deepEqual(out.get("m1"), [
    { emoji: "👍", count: 1, mine: false },
    { emoji: "🥂", count: 2, mine: true },
  ]);
  assert.deepEqual(out.get("m2"), [{ emoji: "😂", count: 1, mine: false }]);
  assert.equal(out.get("m3"), undefined);
  assert.ok(!JSON.stringify([...out.values()]).includes(OTHER), "voter ids must not leak");
});

test("toggleReactionList: add, join, leave, remove", () => {
  assert.deepEqual(toggleReactionList([], "👍"), [{ emoji: "👍", count: 1, mine: true }]);
  assert.deepEqual(toggleReactionList([{ emoji: "👍", count: 2, mine: false }], "👍"), [{ emoji: "👍", count: 3, mine: true }]);
  assert.deepEqual(toggleReactionList([{ emoji: "👍", count: 2, mine: true }], "👍"), [{ emoji: "👍", count: 1, mine: false }]);
  assert.deepEqual(toggleReactionList([{ emoji: "👍", count: 1, mine: true }], "👍"), []);
});

test("voteDecision follows legacy votePoll: same option keeps the vote", () => {
  assert.equal(voteDecision(null, "a"), "insert");
  assert.equal(voteDecision("a", "b"), "change");
  assert.equal(voteDecision("a", "a"), "noop");
});

test("applyVote moves the single vote", () => {
  const opts = [
    { id: "a", label: "A", votes: 3, mine: true },
    { id: "b", label: "B", votes: 1, mine: false },
  ];
  assert.deepEqual(applyVote(opts, "b"), [
    { id: "a", label: "A", votes: 2, mine: false },
    { id: "b", label: "B", votes: 2, mine: true },
  ]);
  assert.deepEqual(applyVote(opts, "a"), opts);
  assert.deepEqual(applyVote(opts, "zzz"), opts);
  const fresh = opts.map((o) => ({ ...o, mine: false }));
  assert.equal(applyVote(fresh, "a").find((o) => o.id === "a")?.votes, 4);
});

test("nextContributionState: cycle free -> claimed by me -> done -> free", () => {
  let s = { status: "free" as const, assigneeId: null };
  const a = nextContributionState(s, ME, false);
  assert.deepEqual(a, { ok: true, next: { status: "claimed", assigneeId: ME } });
  const b = nextContributionState(a.ok ? a.next : s, ME, false);
  assert.deepEqual(b, { ok: true, next: { status: "done", assigneeId: ME } });
  const c = nextContributionState(b.ok ? b.next : s, ME, false);
  assert.deepEqual(c, { ok: true, next: { status: "free", assigneeId: null } });
  s = { status: "free", assigneeId: null };
  assert.deepEqual(nextContributionState(s, OTHER, false, "claimed"), { ok: true, next: { status: "claimed", assigneeId: OTHER } });
});

test("nextContributionState: only assignee or organiser moves a claimed item", () => {
  const claimed = { status: "claimed" as const, assigneeId: OTHER };
  assert.deepEqual(nextContributionState(claimed, ME, false), { ok: false, reason: "forbidden" });
  assert.deepEqual(nextContributionState(claimed, ME, false, "free"), { ok: false, reason: "forbidden" });
  // Organiser marking done keeps the original assignee.
  assert.deepEqual(nextContributionState(claimed, ORG, true), { ok: true, next: { status: "done", assigneeId: OTHER } });
  assert.deepEqual(nextContributionState(claimed, ORG, true, "free"), { ok: true, next: { status: "free", assigneeId: null } });
  // "Върни в процес" by the assignee.
  assert.deepEqual(nextContributionState({ status: "done", assigneeId: OTHER }, OTHER, false, "claimed"), {
    ok: true,
    next: { status: "claimed", assigneeId: OTHER },
  });
});

test("nextContributionState: noop and orphaned items", () => {
  assert.deepEqual(nextContributionState({ status: "done", assigneeId: ME }, ME, false, "done"), { ok: false, reason: "noop" });
  // Assignee deleted their account: anyone may pick it up.
  assert.deepEqual(nextContributionState({ status: "claimed", assigneeId: null }, ME, false), {
    ok: true,
    next: { status: "done", assigneeId: ME },
  });
});
