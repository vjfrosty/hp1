// Phase 2: events domain zod schemas and DTOs. Owned by the events API agent.
import { z } from 'zod';

import { SEASONAL_THEMES, VENUE_TYPES } from '../bulgaria';
import type { SeasonalThemeId, VenueType } from '../types';

const venueTypes = VENUE_TYPES as [VenueType, ...VenueType[]];
const seasonalThemes = Object.keys(SEASONAL_THEMES) as [SeasonalThemeId, ...SeasonalThemeId[]];

/** ISO timestamp with offset ("2026-12-01T19:00:00+02:00" or "...Z"). */
const isoDateTime = z.iso.datetime({ offset: true, message: 'Невалидна дата и час' });

const futureDateTime = isoDateTime.refine((v) => new Date(v).getTime() > Date.now(), {
  message: 'Сбирката трябва да е в бъдещето',
});

/** Relative public asset (`/images/...`) or an https URL. */
const coverImageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => (/^\/images\/[\w./-]+$/.test(v) && !v.includes('..')) || /^https:\/\/\S+$/.test(v), {
    message: 'Невалиден адрес на снимка',
  });

const uuid = z.uuid();

/** POST /api/events */
export const createEventSchema = z
  .object({
    title: z.string().trim().min(3, 'Заглавието е твърде кратко').max(80, 'Заглавието е твърде дълго'),
    description: z.string().trim().max(1000).default(''),
    startsAt: futureDateTime,
    city: z.string().trim().min(1, 'Изберете град').max(60),
    neighborhood: z.string().trim().min(1, 'Изберете квартал').max(80),
    venueName: z.string().trim().max(100).default(''),
    exactAddress: z.string().trim().max(200).default(''),
    venueType: z.enum(venueTypes),
    maxAttendees: z.number().int().min(2, 'Минимум 2 места').max(50, 'Максимум 50 места'),
    isPrivate: z.boolean().default(false),
    manualApproval: z.boolean().default(false),
    /** Visible only to members of `groupId`; requires a group. */
    friendsOnly: z.boolean().default(false),
    nonAlcoholicFriendly: z.boolean().default(true),
    plannedFood: z.string().trim().max(300).default(''),
    seasonalTheme: z.enum(seasonalThemes).default('classic'),
    groupId: uuid.nullish(),
    coverImageUrl: coverImageUrl.nullish(),
  })
  .refine((v) => !v.friendsOnly || Boolean(v.groupId), {
    message: 'Сбирка „само за приятели“ изисква група',
    path: ['friendsOnly'],
  });
export type CreateEventInput = z.input<typeof createEventSchema>;
export type CreateEventData = z.output<typeof createEventSchema>;

/** PATCH /api/events/[id] (organiser only). At least one field. */
export const updateEventSchema = z
  .object({
    venueName: z.string().trim().min(1, 'Въведете място').max(100).optional(),
    exactAddress: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(60).optional(),
    neighborhood: z.string().trim().min(1).max(80).optional(),
    startsAt: futureDateTime.optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Няма промени' });
export type UpdateEventInput = z.input<typeof updateEventSchema>;

/** POST /api/events/[id]/rsvp. `pending_approval` is decided by the server. */
export const rsvpSchema = z.object({
  status: z.enum(['confirmed', 'maybe', 'declined']),
  nonAlcoholic: z.boolean().optional(),
  lateMinutes: z.number().int().min(0).max(240).optional(),
  excuse: z.string().trim().max(200).optional(),
  /** Needed for a private / friends-only event the viewer reached by invite link. */
  inviteCode: z.string().trim().max(64).optional(),
});
export type RsvpInput = z.infer<typeof rsvpSchema>;

/** POST /api/events/[id]/attendees/[userId] (organiser only). */
export const decideAttendeeSchema = z.object({
  action: z.enum(['approve', 'reject']),
});
export type DecideAttendeeInput = z.infer<typeof decideAttendeeSchema>;

export const eventScopes = ['feed', 'radar', 'mine'] as const;
export type EventScope = (typeof eventScopes)[number];

/** GET /api/events query string. */
export const eventsQuerySchema = z.object({
  city: z.string().trim().min(1).max(60).optional(),
  scope: z.enum(eventScopes).default('feed'),
});
export type EventsQuery = z.input<typeof eventsQuerySchema>;
