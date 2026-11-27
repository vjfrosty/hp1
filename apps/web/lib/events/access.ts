import type { RSVPStatus } from "@hp1/shared";

/** What the server knows about one viewer's relation to one event. */
export interface ViewerContext {
  viewerId: string;
  organizerId: string;
  isPrivate: boolean;
  friendsOnly: boolean;
  /** Viewer's own RSVP row status, if any. */
  myStatus: RSVPStatus | null;
  /** Viewer is a member of the event's group. */
  isGroupMember: boolean;
  /** Request came through the event's invite code. */
  viaInvite: boolean;
  /** Viewer and organiser block each other (either direction). */
  blocked: boolean;
}

/**
 * May the viewer see this event at all? Private and friends-only events are
 * hidden from the feed and radar for non-members (AGENTS.md rule 4).
 */
export function canViewEvent(c: ViewerContext): boolean {
  if (c.viewerId === c.organizerId) return true;
  if (c.blocked) return false;
  if (c.myStatus !== null) return true;
  if (c.viaInvite) return true;
  if (c.friendsOnly) return c.isGroupMember;
  return !c.isPrivate;
}

/** May the viewer see exact_address, the attendee list and the chat? */
export function canSeePrivateDetails(c: Pick<ViewerContext, "viewerId" | "organizerId" | "myStatus">): boolean {
  return c.viewerId === c.organizerId || c.myStatus === "confirmed";
}

/** May the viewer RSVP? Same as view, minus blocks (already in canViewEvent). */
export function canRsvp(c: ViewerContext, isCancelled: boolean): boolean {
  return !isCancelled && c.viewerId !== c.organizerId && canViewEvent(c);
}
