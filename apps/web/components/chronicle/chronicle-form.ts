import type { ChronicleVisibility, CreateChronicleInput, CreateWisdomInput, WisdomDTO } from "@hp1/shared";

/** Pure form-to-request mapping for the chronicle and wisdom forms (tested). */

export interface ChronicleFormState {
  title: string;
  eventId: string;
  groupId: string;
  city: string;
  officialDecision: string;
  story: string;
  photoUrl: string;
  visibility: ChronicleVisibility;
  consentConfirmed: boolean;
  taggedUserIds: string[];
}

export type FormResult<T> = { ok: true; input: T } | { ok: false; error: string };

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildChronicleInput(f: ChronicleFormState): FormResult<CreateChronicleInput> {
  const decision = f.officialDecision.trim();
  const story = f.story.trim();
  const photoUrl = f.photoUrl.trim();
  if (!decision && !story) return { ok: false, error: "Запиши поне решение или кратка история." };
  if (!f.city) return { ok: false, error: "Избери град." };
  if (photoUrl && !isHttpsUrl(photoUrl)) return { ok: false, error: "Снимката трябва да е https:// адрес." };
  if (f.visibility === "group" && !f.groupId) return { ok: false, error: "Избери дружина за видимост „Само дружината“." };
  const needsConsent = Boolean(photoUrl) || f.taggedUserIds.length > 0;
  if (needsConsent && !f.consentConfirmed) {
    return { ok: false, error: "Нужно е съгласието на участниците преди публикуване в летописа." };
  }
  return {
    ok: true,
    input: {
      title: f.title.trim(),
      eventId: f.eventId || null,
      groupId: f.groupId || null,
      city: f.city,
      officialDecision: decision,
      story,
      photoUrl: photoUrl || null,
      visibility: f.visibility,
      consentConfirmed: f.consentConfirmed,
      taggedUserIds: f.taggedUserIds,
    },
  };
}

export interface WisdomFormState {
  quote: string;
  context: string;
  groupId: string;
  quotedUserId: string;
}

export function buildWisdomInput(f: WisdomFormState): FormResult<CreateWisdomInput> {
  const quote = f.quote.trim();
  if (!quote) return { ok: false, error: "Запиши мисълта." };
  return {
    ok: true,
    input: {
      quote,
      context: f.context.trim(),
      quotedUserId: f.quotedUserId || null,
      // The quoted person consents themselves (POST /api/wisdom/[id]/consent).
      consentGiven: false,
      sharedToGroup: Boolean(f.groupId),
      groupId: f.groupId || null,
    },
  };
}

/** A quote about another person that they have not approved yet. */
export function wisdomPending(w: WisdomDTO): boolean {
  if (!w.quotedUser || w.consentGiven) return false;
  // Quoting yourself needs no approval.
  return w.quotedUser.id !== w.author?.id;
}

/** The viewer is the quoted person and still has to approve or remove the quote. */
export function wisdomNeedsMyConsent(w: WisdomDTO, meId: string | undefined): boolean {
  return wisdomPending(w) && !w.viewerIsAuthor && Boolean(meId) && w.quotedUser?.id === meId;
}

export const VISIBILITY_LABELS: Record<ChronicleVisibility, string> = {
  friends: "Само участниците",
  group: "Само дружината",
  public: "Публично",
};
