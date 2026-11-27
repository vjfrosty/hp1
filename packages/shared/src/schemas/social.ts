// Phase 2: social domain zod schemas and DTOs. Owned by the social API agent.
// Event chat, reactions, pins, polls ("Съдът на мезето") and meze contributions.
import { z } from 'zod';

import { CHAT_STICKERS } from '../bulgaria';
import type { MezeStatus } from '../types';
import type { UserSummary } from '../api/events';

// ─── constants ────────────────────────────────────────────────────────────────

/** Quick reactions offered by the chat UI. The server rejects anything else. */
export const CHAT_REACTIONS = ['👍', '😂', '🥂', '❤️', '🔥'] as const;
export type ChatReaction = (typeof CHAT_REACTIONS)[number];

export const CHAT_STICKER_IDS = CHAT_STICKERS.map((s) => s.id) as [string, ...string[]];

export const MESSAGE_MAX_LENGTH = 1000;
export const MESSAGES_PAGE_SIZE = 200;

export const CONTRIBUTION_CATEGORIES = ['салата', 'мезе', 'скара', 'напитки', 'логистика'] as const;
export type ContributionCategory = (typeof CONTRIBUTION_CATEGORIES)[number];

export const MEZE_STATUSES = ['free', 'claimed', 'done'] as const satisfies readonly MezeStatus[];

// ─── request schemas ─────────────────────────────────────────────────────────

/**
 * POST /api/events/[id]/messages. At least one of text, sticker, locationCard.
 * `locationCard: true` shares the event's venue card; the server builds the card
 * from the event row and never trusts client-supplied venue data.
 */
export const sendMessageSchema = z
  .object({
    text: z.string().trim().max(MESSAGE_MAX_LENGTH).optional(),
    sticker: z.enum(CHAT_STICKER_IDS).optional(),
    locationCard: z.boolean().optional(),
  })
  .refine((v) => Boolean(v.text) || Boolean(v.sticker) || v.locationCard === true, {
    message: 'Съобщението е празно',
    path: ['text'],
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** GET /api/events/[id]/messages?after=<ISO> */
export const messagesQuerySchema = z.object({
  after: z.iso.datetime({ offset: true }).optional(),
});

/** POST /api/events/[id]/messages/[messageId]/reactions */
export const toggleReactionSchema = z.object({
  emoji: z.enum(CHAT_REACTIONS),
});
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;

/** POST /api/events/[id]/polls */
export const createPollSchema = z.object({
  question: z.string().trim().min(1).max(200),
  options: z
    .array(z.string().trim().min(1).max(80))
    .min(2)
    .max(6)
    .refine((opts) => new Set(opts.map((o) => o.toLocaleLowerCase('bg'))).size === opts.length, {
      message: 'Опциите трябва да са различни',
    }),
  /** "Съдът на мезето" official ruling. Organiser only. */
  isOfficialCourt: z.boolean().optional(),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

/** POST /api/events/[id]/polls/[pollId]/vote */
export const votePollSchema = z.object({
  optionId: z.uuid(),
});
export type VotePollInput = z.infer<typeof votePollSchema>;

/** POST /api/events/[id]/contributions */
export const addContributionSchema = z.object({
  item: z.string().trim().min(1).max(100),
  category: z.enum(CONTRIBUTION_CATEGORIES),
});
export type AddContributionInput = z.infer<typeof addContributionSchema>;

/**
 * PATCH /api/events/[id]/contributions/[contributionId]
 * - `cycle`: free -> claimed by me -> done -> free.
 * - `set`: jump to a status (the legacy buttons "Освободи" and "Върни в процес").
 */
export const updateContributionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cycle') }),
  z.object({ action: z.literal('set'), status: z.enum(MEZE_STATUSES) }),
]);
export type UpdateContributionInput = z.infer<typeof updateContributionSchema>;

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ReactionDTO {
  emoji: string;
  count: number;
  /** The viewer reacted with this emoji. Who else reacted is never exposed. */
  mine: boolean;
}

export interface ChatMessageDTO {
  id: string;
  /** null: the sender deleted their account ("изтрит участник"), or a system message. */
  sender: UserSummary | null;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
  isSystem: boolean;
  isPinned: boolean;
  /** A CHAT_STICKERS id, or null. */
  sticker: string | null;
  locationCard: { venueName: string; neighborhood: string; city: string } | null;
  reactions: ReactionDTO[];
}

export interface PollOptionDTO {
  id: string;
  label: string;
  votes: number;
  mine: boolean;
}

/** Only counts and the viewer's own choice; voters are never listed. */
export interface PollDTO {
  id: string;
  question: string;
  isOfficialCourt: boolean;
  createdBy: UserSummary | null;
  createdAt: string;
  options: PollOptionDTO[];
  totalVotes: number;
}

export interface ContributionDTO {
  id: string;
  item: string;
  category: ContributionCategory;
  status: MezeStatus;
  assignee: UserSummary | null;
}

export interface MessagesResponse {
  messages: ChatMessageDTO[];
}
export interface ReactionsResponse {
  messageId: string;
  reactions: ReactionDTO[];
}
export interface PinResponse {
  messageId: string;
  isPinned: boolean;
}
export interface PollsResponse {
  polls: PollDTO[];
}
export interface ContributionsResponse {
  contributions: ContributionDTO[];
}
