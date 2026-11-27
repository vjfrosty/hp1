import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addContributionSchema,
  createPollSchema,
  messagesQuerySchema,
  sendMessageSchema,
  toggleReactionSchema,
  updateContributionSchema,
  votePollSchema,
} from "../../../packages/shared/src/schemas/social.ts";

test("sendMessageSchema: needs text, sticker or location card", () => {
  assert.equal(sendMessageSchema.safeParse({}).success, false);
  assert.equal(sendMessageSchema.safeParse({ text: "   " }).success, false);
  assert.equal(sendMessageSchema.safeParse({ locationCard: false }).success, false);
  assert.deepEqual(sendMessageSchema.parse({ text: "  Наздраве!  " }), { text: "Наздраве!" });
  assert.equal(sendMessageSchema.safeParse({ sticker: "clink" }).success, true);
  assert.equal(sendMessageSchema.safeParse({ text: "", locationCard: true }).success, true);
});

test("sendMessageSchema: length and sticker allow-list", () => {
  assert.equal(sendMessageSchema.safeParse({ text: "а".repeat(1000) }).success, true);
  assert.equal(sendMessageSchema.safeParse({ text: "а".repeat(1001) }).success, false);
  assert.equal(sendMessageSchema.safeParse({ sticker: "🥂 Наздраве!" }).success, false);
  assert.equal(sendMessageSchema.safeParse({ sticker: "nope" }).success, false);
});

test("messagesQuerySchema: after must be ISO", () => {
  assert.equal(messagesQuerySchema.safeParse({}).success, true);
  assert.equal(messagesQuerySchema.safeParse({ after: "2026-11-27T18:00:00.000Z" }).success, true);
  assert.equal(messagesQuerySchema.safeParse({ after: "вчера" }).success, false);
});

test("toggleReactionSchema: allow-listed emoji only", () => {
  assert.equal(toggleReactionSchema.safeParse({ emoji: "🥂" }).success, true);
  assert.equal(toggleReactionSchema.safeParse({ emoji: "🍺🍺🍺" }).success, false);
});

test("createPollSchema: 2-6 distinct, trimmed options", () => {
  assert.equal(createPollSchema.safeParse({ question: "Ракия или вино?", options: ["Ракия"] }).success, false);
  assert.equal(createPollSchema.safeParse({ question: "Q", options: ["a", "b", "c", "d", "e", "f", "g"] }).success, false);
  assert.equal(createPollSchema.safeParse({ question: "Q", options: ["Ракия", " ракия "] }).success, false);
  assert.equal(createPollSchema.safeParse({ question: " ", options: ["a", "b"] }).success, false);
  assert.deepEqual(createPollSchema.parse({ question: " Q ", options: [" a", "b "] }), { question: "Q", options: ["a", "b"] });
});

test("votePollSchema / contribution schemas", () => {
  assert.equal(votePollSchema.safeParse({ optionId: "x" }).success, false);
  assert.equal(votePollSchema.safeParse({ optionId: "6f1c2b1e-8a3d-4c55-9a1e-2b3c4d5e6f70" }).success, true);
  assert.equal(addContributionSchema.safeParse({ item: "Шопска", category: "салата" }).success, true);
  assert.equal(addContributionSchema.safeParse({ item: "Шопска", category: "десерт" }).success, false);
  assert.equal(updateContributionSchema.safeParse({ action: "cycle" }).success, true);
  assert.equal(updateContributionSchema.safeParse({ action: "set", status: "free" }).success, true);
  assert.equal(updateContributionSchema.safeParse({ action: "set", status: "lost" }).success, false);
  assert.equal(updateContributionSchema.safeParse({ action: "steal" }).success, false);
});
