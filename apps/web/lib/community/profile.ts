import {
  BULGARIAN_CITIES,
  type CompanySizePref,
  type HumorousRoleId,
  type ProfileDTO,
  type ProfilePatchInput,
  type VenueType,
} from "@hp1/shared";

/** Columns a profile PATCH may write. Anything else is never set from a body. */
export interface ProfileUpdate {
  nickname?: string;
  avatarInitials?: string;
  city?: string;
  neighborhood?: string | null;
  usualAvailability?: string;
  companySize?: string;
  roleId?: string;
  preferredVenues?: string[];
  favoriteMeze?: string[];
  interests?: string[];
  nonAlcoholicPreferred?: boolean;
  radarActive?: boolean;
  radarRadiusKm?: number;
  radarMessage?: string | null;
}

export function initialsOf(nickname: string): string {
  return nickname
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Turns a zod-validated patch into the exact column set to write.
 *
 * - Copies only allow-listed keys (a body's `earnedBadges`, `ageConfirmedAt`,
 *   `isAdmin`, `id` are dropped even if a caller skipped zod).
 * - The neighbourhood must belong to the resulting city. Changing the city
 *   without a neighbourhood clears a neighbourhood that does not fit.
 * - avatarInitials is recomputed whenever the nickname changes.
 */
export function buildProfileUpdate(
  patch: ProfilePatchInput,
  current: { city: string | null; neighborhood: string | null },
): { ok: true; set: ProfileUpdate } | { ok: false; error: string } {
  const set: ProfileUpdate = {};
  const copy = <K extends keyof ProfileUpdate & keyof ProfilePatchInput>(key: K) => {
    if (patch[key] !== undefined) set[key] = patch[key] as ProfileUpdate[K];
  };
  copy("usualAvailability");
  copy("companySize");
  copy("roleId");
  copy("preferredVenues");
  copy("favoriteMeze");
  copy("interests");
  copy("nonAlcoholicPreferred");
  copy("radarActive");
  copy("radarRadiusKm");

  if (patch.nickname !== undefined) {
    const nickname = patch.nickname.trim();
    if (nickname.length < 2 || nickname.length > 40) return { ok: false, error: "nickname: 2–40 characters" };
    set.nickname = nickname;
    set.avatarInitials = initialsOf(nickname);
  }

  if (patch.radarMessage !== undefined) {
    const msg = patch.radarMessage?.trim() ?? "";
    set.radarMessage = msg === "" ? null : msg;
  }

  if (patch.city !== undefined || patch.neighborhood !== undefined) {
    const city = patch.city ?? current.city;
    const cityInfo = city ? BULGARIAN_CITIES.find((c) => c.name === city) : undefined;
    if (patch.city !== undefined && !cityInfo) return { ok: false, error: "city: unknown city" };
    const fits = (n: string | null) => n !== null && cityInfo?.neighborhoods.some((h) => h.name === n) === true;

    if (patch.neighborhood !== undefined) {
      const hood = patch.neighborhood?.trim() || null;
      if (hood !== null && !fits(hood)) return { ok: false, error: "neighborhood: not in this city" };
      set.neighborhood = hood;
    } else if (!fits(current.neighborhood)) {
      set.neighborhood = null;
    }
    if (patch.city !== undefined) set.city = patch.city;
  }

  return { ok: true, set };
}

export interface ProfileRowLike {
  id: string;
  nickname: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  city: string | null;
  neighborhood: string | null;
  usualAvailability: string | null;
  companySize: string | null;
  roleId: string | null;
  preferredVenues: string[];
  favoriteMeze: string[];
  interests: string[];
  earnedBadges: string[];
  nonAlcoholicPreferred: boolean;
  radarActive: boolean;
  radarRadiusKm: number;
  radarMessage: string | null;
  ageConfirmedAt: Date | null;
  createdAt: Date;
}

/** The viewer's own profile. Never includes email, Clerk id or admin flags. */
export function toProfileDTO(u: ProfileRowLike): ProfileDTO {
  return {
    id: u.id,
    nickname: u.nickname,
    avatarInitials: u.avatarInitials,
    avatarColor: u.avatarColor,
    avatarUrl: u.avatarUrl,
    city: u.city,
    neighborhood: u.neighborhood,
    usualAvailability: u.usualAvailability,
    companySize: u.companySize as CompanySizePref | null,
    roleId: u.roleId as HumorousRoleId | null,
    preferredVenues: u.preferredVenues as VenueType[],
    favoriteMeze: u.favoriteMeze,
    interests: u.interests,
    earnedBadges: u.earnedBadges,
    nonAlcoholicPreferred: u.nonAlcoholicPreferred,
    radarActive: u.radarActive,
    radarRadiusKm: u.radarRadiusKm,
    radarMessage: u.radarMessage,
    ageConfirmed: u.ageConfirmedAt !== null,
    createdAt: u.createdAt.toISOString(),
  };
}
