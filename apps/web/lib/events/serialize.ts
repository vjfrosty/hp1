import type { AttendeeDTO, PublicEvent, RSVPStatus, SeasonalThemeId, UserSummary, VenueType } from "@hp1/shared";

import { canSeePrivateDetails } from "./access";

/** Minimal row shapes, so this stays a pure, unit-testable function. */
export interface EventRowLike {
  id: string;
  organizerId: string;
  groupId: string | null;
  title: string;
  description: string;
  startsAt: Date;
  city: string;
  neighborhood: string;
  venueName: string;
  exactAddress: string;
  venueType: string;
  approxLat: number;
  approxLng: number;
  maxAttendees: number;
  isPrivate: boolean;
  manualApproval: boolean;
  friendsOnly: boolean;
  plannedFood: string;
  nonAlcoholicFriendly: boolean;
  seasonalTheme: string;
  coverImageUrl: string | null;
  inviteCode: string;
  cancelledAt: Date | null;
}

export interface AttendeeRowLike extends UserSummary {
  status: RSVPStatus;
  isOrganizer: boolean;
  nonAlcoholic: boolean;
  lateMinutes: number | null;
  excuse: string | null;
  joinedAt: Date;
}

/**
 * The ONLY way an event leaves the server (AGENTS.md rule 3). Every route that
 * returns an event calls this. exact_address, invite code and attendee list
 * are added only for viewers allowed to see them.
 */
export function toPublicEvent(
  event: EventRowLike,
  organizer: UserSummary,
  attendees: AttendeeRowLike[],
  viewerId: string,
): PublicEvent {
  const mine = attendees.find((a) => a.id === viewerId);
  const myStatus = mine?.status ?? null;
  const viewerIsOrganizer = viewerId === event.organizerId;
  const privateOk = canSeePrivateDetails({ viewerId, organizerId: event.organizerId, myStatus });

  const counts = { confirmed: 0, maybe: 0, pending: 0 };
  for (const a of attendees) {
    if (a.status === "confirmed") counts.confirmed++;
    else if (a.status === "maybe") counts.maybe++;
    else if (a.status === "pending_approval") counts.pending++;
  }

  const out: PublicEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    city: event.city,
    neighborhood: event.neighborhood,
    venueName: event.venueName,
    venueType: event.venueType as VenueType,
    coords: [event.approxLat, event.approxLng],
    maxAttendees: event.maxAttendees,
    isPrivate: event.isPrivate,
    manualApproval: event.manualApproval,
    friendsOnly: event.friendsOnly,
    plannedFood: event.plannedFood,
    nonAlcoholicFriendly: event.nonAlcoholicFriendly,
    seasonalTheme: event.seasonalTheme as SeasonalThemeId,
    coverImageUrl: event.coverImageUrl,
    groupId: event.groupId,
    isCancelled: event.cancelledAt !== null,
    organizer,
    counts,
    myStatus,
    viewerIsOrganizer,
  };

  if (privateOk) {
    out.exactAddress = event.exactAddress;
    out.attendees = attendees.map(
      (a): AttendeeDTO => ({
        id: a.id,
        nickname: a.nickname,
        avatarInitials: a.avatarInitials,
        avatarColor: a.avatarColor,
        avatarUrl: a.avatarUrl,
        roleId: a.roleId,
        status: a.status,
        isOrganizer: a.isOrganizer,
        nonAlcoholic: a.nonAlcoholic,
        lateMinutes: a.lateMinutes,
        excuse: a.excuse,
        joinedAt: a.joinedAt.toISOString(),
      }),
    );
  }
  if (viewerIsOrganizer) out.inviteCode = event.inviteCode;
  return out;
}
