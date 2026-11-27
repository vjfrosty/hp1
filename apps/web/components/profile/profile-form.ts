import { BULGARIAN_CITIES, HUMOROUS_ROLE_IDS, type ProfileDTO, type ProfilePatchInput } from "@hp1/shared";

/** Pure helpers for the profile ("ракиен паспорт") form (tested). */

export type ProfileForm = Required<{
  [K in keyof ProfilePatchInput]-?: Exclude<ProfilePatchInput[K], undefined>;
}>;

export function neighborhoodsFor(city: string): string[] {
  return BULGARIAN_CITIES.find((c) => c.name === city)?.neighborhoods.map((n) => n.name) ?? [];
}

export function formFromProfile(p: ProfileDTO): ProfileForm {
  return {
    nickname: p.nickname,
    city: p.city ?? BULGARIAN_CITIES[0].name,
    neighborhood: p.neighborhood,
    usualAvailability: p.usualAvailability ?? "",
    companySize: p.companySize ?? "4–6 души",
    roleId: p.roleId ?? HUMOROUS_ROLE_IDS[0],
    preferredVenues: p.preferredVenues,
    favoriteMeze: p.favoriteMeze,
    interests: p.interests,
    nonAlcoholicPreferred: p.nonAlcoholicPreferred,
    radarActive: p.radarActive,
    radarRadiusKm: p.radarRadiusKm,
    radarMessage: p.radarMessage,
  };
}

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join("\u0000") === [...b].sort().join("\u0000");

/** Only the fields that differ from the stored profile, trimmed. Empty object = nothing to save. */
export function profilePatch(p: ProfileDTO, f: ProfileForm): ProfilePatchInput {
  const base = formFromProfile(p);
  const out: ProfilePatchInput = {};
  const nickname = f.nickname.trim();
  if (nickname !== p.nickname) out.nickname = nickname;
  if (f.city !== p.city) out.city = f.city;
  const hood = f.neighborhood?.trim() || null;
  if (hood !== p.neighborhood || out.city !== undefined) out.neighborhood = hood;
  const avail = f.usualAvailability.trim();
  if (avail !== (p.usualAvailability ?? "")) out.usualAvailability = avail;
  if (f.companySize !== p.companySize) out.companySize = f.companySize;
  if (f.roleId !== p.roleId) out.roleId = f.roleId;
  if (!sameList(f.preferredVenues, base.preferredVenues)) out.preferredVenues = f.preferredVenues;
  if (!sameList(f.favoriteMeze, base.favoriteMeze)) out.favoriteMeze = f.favoriteMeze;
  if (!sameList(f.interests, base.interests)) out.interests = f.interests;
  if (f.nonAlcoholicPreferred !== p.nonAlcoholicPreferred) out.nonAlcoholicPreferred = f.nonAlcoholicPreferred;
  if (f.radarActive !== p.radarActive) out.radarActive = f.radarActive;
  if (f.radarRadiusKm !== p.radarRadiusKm) out.radarRadiusKm = f.radarRadiusKm;
  const msg = f.radarMessage?.trim() || null;
  if (msg !== p.radarMessage) out.radarMessage = msg;
  return out;
}

/** Client-side check mirroring profilePatchSchema; null when valid. */
export function profileFormError(f: ProfileForm): string | null {
  const nick = f.nickname.trim();
  if (nick.length < 2 || nick.length > 40) return "Прякорът трябва да е между 2 и 40 знака.";
  if (f.neighborhood && !neighborhoodsFor(f.city).includes(f.neighborhood)) return "Кварталът не е в избрания град.";
  if (f.usualAvailability.trim().length > 120) return "Свободното време е най-много 120 знака.";
  if (!Number.isInteger(f.radarRadiusKm) || f.radarRadiusKm < 1 || f.radarRadiusKm > 50) {
    return "Радиусът на радара е между 1 и 50 км.";
  }
  if ((f.radarMessage ?? "").trim().length > 140) return "Съобщението за радара е най-много 140 знака.";
  for (const list of [f.preferredVenues, f.favoriteMeze, f.interests]) {
    if (list.length > 10) return "Най-много 10 избора във всеки списък.";
  }
  return null;
}

export function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}
