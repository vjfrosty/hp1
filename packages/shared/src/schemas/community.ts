// Phase 2: community domain zod schemas and DTOs. Owned by the community API agent.
// Profile, groups + quorum voting, chronicle, table wisdom, notifications.
import { z } from 'zod';

import type { UserSummary } from '../api/events';
import { BULGARIAN_CITIES, HUMOROUS_ROLES, INTEREST_OPTIONS, MEZE_PREFERENCES, VENUE_TYPES } from '../bulgaria';
import type { CompanySizePref, HumorousRoleId, VenueType } from '../types';

// ─── shared pieces ───────────────────────────────────────────────────────────

export const COMPANY_SIZES = ['2–3 души', '4–6 души', '7+ души'] as const satisfies readonly CompanySizePref[];
export const HUMOROUS_ROLE_IDS = Object.keys(HUMOROUS_ROLES) as [HumorousRoleId, ...HumorousRoleId[]];
export const CHRONICLE_VISIBILITIES = ['friends', 'group', 'public'] as const;
export type ChronicleVisibility = (typeof CHRONICLE_VISIBILITIES)[number];
export type NotificationTypeId = 'invite' | 'approval' | 'change' | 'cancel' | 'quorum';

const uuid = z.uuid();
const cityName = z
  .string()
  .trim()
  .refine((c) => BULGARIAN_CITIES.some((x) => x.name === c), 'Unknown city');

/** Allow-listed multi-select: unique values, at most 10. */
const allowList = <T extends string>(values: readonly T[]) =>
  z
    .array(z.enum(values as unknown as [T, ...T[]]))
    .max(10)
    .transform((xs) => [...new Set(xs)]);

// ─── profile ─────────────────────────────────────────────────────────────────

/**
 * PATCH /api/me/profile. Unknown keys (earnedBadges, ageConfirmedAt, isAdmin,
 * id, clerkUserId, avatarInitials, ...) are stripped, never applied.
 * City/neighbourhood consistency is checked on the server against the stored row.
 */
export const profilePatchSchema = z.object({
  nickname: z.string().trim().min(2).max(40).optional(),
  city: cityName.optional(),
  neighborhood: z.string().trim().max(60).nullable().optional(),
  usualAvailability: z.string().trim().max(120).optional(),
  companySize: z.enum(COMPANY_SIZES).optional(),
  roleId: z.enum(HUMOROUS_ROLE_IDS).optional(),
  preferredVenues: allowList<VenueType>(VENUE_TYPES).optional(),
  favoriteMeze: allowList(MEZE_PREFERENCES).optional(),
  interests: allowList(INTEREST_OPTIONS).optional(),
  nonAlcoholicPreferred: z.boolean().optional(),
  radarActive: z.boolean().optional(),
  radarRadiusKm: z.int().min(1).max(50).optional(),
  radarMessage: z.string().trim().max(140).nullable().optional(),
});
export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;

export interface ProfileDTO {
  id: string;
  nickname: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  city: string | null;
  neighborhood: string | null;
  usualAvailability: string | null;
  companySize: CompanySizePref | null;
  roleId: HumorousRoleId | null;
  preferredVenues: VenueType[];
  favoriteMeze: string[];
  interests: string[];
  /** Server-awarded only; never writable through the API. */
  earnedBadges: string[];
  nonAlcoholicPreferred: boolean;
  radarActive: boolean;
  radarRadiusKm: number;
  radarMessage: string | null;
  ageConfirmed: boolean;
  createdAt: string;
}

// ─── groups & quorum ─────────────────────────────────────────────────────────

/** POST /api/groups */
export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  motto: z.string().trim().max(140).default(''),
  city: cityName,
  regularSchedule: z.string().trim().max(80).default(''),
  quorumRequired: z.int().min(2).max(30).default(3),
});
export type CreateGroupInput = z.input<typeof createGroupSchema>;

/** POST /api/groups/[id]/quorum-slots */
export const createQuorumSlotSchema = z.object({
  label: z.string().trim().min(2).max(60),
  /** ISO timestamp with offset; must be in the future (checked on the server). */
  startsAt: z.iso.datetime({ offset: true }),
});
export type CreateQuorumSlotInput = z.infer<typeof createQuorumSlotSchema>;

export interface QuorumSlotDTO {
  id: string;
  label: string;
  /** ISO timestamp. Format in Europe/Sofia on the client. */
  startsAt: string;
  votes: number;
  /** Viewer voted for this slot. */
  mine: boolean;
  /** votes >= quorumRequired */
  reached: boolean;
}

export interface GroupDTO {
  id: string;
  name: string;
  motto: string;
  city: string;
  regularSchedule: string;
  quorumRequired: number;
  meetingsHeld: number;
  /** Computed from group_members, never stored. */
  memberCount: number;
  /** First 12 members by join date, minus anyone who blocks / is blocked by the viewer. */
  members: UserSummary[];
  isMember: boolean;
  /** Upcoming slots (starts_at within the last 12 h or later), soonest first. */
  quorumSlots: QuorumSlotDTO[];
}

// ─── chronicle ───────────────────────────────────────────────────────────────

/** POST /api/chronicles */
export const createChronicleSchema = z
  .object({
    title: z.string().trim().max(120).default(''),
    eventId: uuid.nullish(),
    groupId: uuid.nullish(),
    city: cityName,
    officialDecision: z.string().trim().max(280).default(''),
    story: z.string().trim().max(4000).default(''),
    photoUrl: z.url({ protocol: /^https$/ }).max(2048).nullish(),
    visibility: z.enum(CHRONICLE_VISIBILITIES),
    consentConfirmed: z.boolean().default(false),
    taggedUserIds: z
      .array(uuid)
      .max(20)
      .default([])
      .transform((xs) => [...new Set(xs)]),
  })
  .refine((c) => c.consentConfirmed || (!c.photoUrl && c.taggedUserIds.length === 0), {
    message: 'Нужно е съгласието на участниците преди публикуване в летописа.',
    path: ['consentConfirmed'],
  })
  .refine((c) => c.visibility !== 'group' || Boolean(c.groupId), {
    message: 'groupId is required for group visibility',
    path: ['groupId'],
  });
export type CreateChronicleInput = z.input<typeof createChronicleSchema>;

/** POST /api/chronicles/[id]/tag-consent */
export const tagConsentSchema = z.object({ accept: z.boolean() });
export type TagConsentInput = z.infer<typeof tagConsentSchema>;

export interface ChronicleTagDTO extends UserSummary {
  /** true only in the author's own view: the person has not approved yet. */
  pending: boolean;
}

export interface ChronicleDTO {
  id: string;
  title: string;
  city: string;
  officialDecision: string;
  story: string;
  photoUrl: string | null;
  visibility: ChronicleVisibility;
  consentConfirmed: boolean;
  eventId: string | null;
  groupId: string | null;
  groupName: string | null;
  /** null after the author deleted their account. */
  author: UserSummary | null;
  /** Consented tags only; the author also sees pending ones (pending: true). */
  tagged: ChronicleTagDTO[];
  likes: number;
  likedByMe: boolean;
  viewerIsAuthor: boolean;
  /** Viewer is tagged and has not answered yet: show the consent prompt. */
  myTagPending: boolean;
  createdAt: string;
}

export interface ChronicleLikeResult {
  liked: boolean;
  likes: number;
}

export interface TagConsentResult {
  status: 'accepted' | 'removed';
}

// ─── table wisdom ────────────────────────────────────────────────────────────

/** POST /api/wisdom */
export const createWisdomSchema = z
  .object({
    quote: z.string().trim().min(1).max(280),
    context: z.string().trim().max(140).default(''),
    quotedUserId: uuid.nullish(),
    /**
     * Ignored when quoting someone else: only the quoted person can consent,
     * via POST /api/wisdom/[id]/consent. Kept for quotes with no quoted user.
     */
    consentGiven: z.boolean().default(false),
    sharedToGroup: z.boolean().default(false),
    groupId: uuid.nullish(),
  })
  .refine((w) => !w.sharedToGroup || Boolean(w.groupId), {
    message: 'groupId is required when sharedToGroup is true',
    path: ['groupId'],
  });
export type CreateWisdomInput = z.input<typeof createWisdomSchema>;

/** POST /api/wisdom/[id]/consent — the quoted person accepts or removes the quote. */
export const wisdomConsentSchema = z.object({ accept: z.boolean() });
export type WisdomConsentInput = z.infer<typeof wisdomConsentSchema>;
export interface WisdomConsentResult {
  status: 'accepted' | 'removed';
}

export interface WisdomDTO {
  id: string;
  quote: string;
  context: string;
  author: UserSummary | null;
  quotedUser: UserSummary | null;
  consentGiven: boolean;
  sharedToGroup: boolean;
  groupId: string | null;
  groupName: string | null;
  viewerIsAuthor: boolean;
  createdAt: string;
}

// ─── notifications ───────────────────────────────────────────────────────────

/** POST /api/notifications/read. No ids (or omitted) marks all as read. */
export const markNotificationsReadSchema = z.object({
  ids: z.array(uuid).max(100).optional(),
});
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;

export interface NotificationDTO {
  id: string;
  type: NotificationTypeId;
  title: string;
  body: string;
  eventId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationDTO[];
  unreadCount: number;
}
