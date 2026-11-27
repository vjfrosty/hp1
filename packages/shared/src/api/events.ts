import type { RSVPStatus, SeasonalThemeId, VenueType } from '../types';

/** Compact public identity of a user. Never includes email or Clerk id. */
export interface UserSummary {
  id: string;
  nickname: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  roleId: string | null;
}

export interface AttendeeDTO extends UserSummary {
  status: RSVPStatus;
  isOrganizer: boolean;
  nonAlcoholic: boolean;
  lateMinutes: number | null;
  excuse: string | null;
  joinedAt: string;
}

/**
 * The only event shape an API route may return. Produced by `toPublicEvent()`
 * on the server. `exactAddress` and `inviteCode` are present only when the
 * viewer is allowed to see them (AGENTS.md rule 3).
 */
export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  /** ISO timestamp. Format labels ("днес", "вечер") on the client in Europe/Sofia. */
  startsAt: string;
  city: string;
  neighborhood: string;
  venueName: string;
  venueType: VenueType;
  /** District centre, never exact GPS. [lat, lng] */
  coords: [number, number];
  maxAttendees: number;
  isPrivate: boolean;
  manualApproval: boolean;
  friendsOnly: boolean;
  plannedFood: string;
  nonAlcoholicFriendly: boolean;
  seasonalTheme: SeasonalThemeId;
  coverImageUrl: string | null;
  groupId: string | null;
  isCancelled: boolean;
  organizer: UserSummary;
  counts: { confirmed: number; maybe: number; pending: number };
  /** Viewer's own RSVP, or null. */
  myStatus: RSVPStatus | null;
  viewerIsOrganizer: boolean;
  /** Only for the organiser and confirmed attendees. */
  exactAddress?: string;
  /** Only for the organiser. */
  inviteCode?: string;
  /** Full list only for organiser and confirmed attendees; otherwise omitted. */
  attendees?: AttendeeDTO[];
}
