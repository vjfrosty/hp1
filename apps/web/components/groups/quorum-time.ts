/**
 * Pure helpers for quorum-slot times. The server takes `startsAt` as an ISO
 * timestamp with offset, in the future and at most 180 days ahead. Users type
 * a local Europe/Sofia date and time; these turn it into that ISO string.
 */
const TZ = "Europe/Sofia";
export const QUORUM_MAX_AHEAD_DAYS = 180;
const DAY_MS = 86_400_000;

/** Sofia's UTC offset in minutes at the given instant (120 in winter, 180 in summer). */
export function sofiaOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * `"2026-11-28"`, `"19:30"` (Sofia wall clock) to `"2026-11-28T19:30:00+02:00"`.
 * Returns null for malformed input. A time inside the spring-forward gap
 * resolves to the instant one hour later on the wall clock.
 */
export function sofiaLocalToIso(date: string, time: string): string | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!dm || !tm) return null;
  const [y, mo, d, h, mi] = [Number(dm[1]), Number(dm[2]), Number(dm[3]), Number(tm[1]), Number(tm[2])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(wall);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;

  // Two passes settle the offset around DST switches.
  let offset = sofiaOffsetMinutes(new Date(wall - 120 * 60_000));
  offset = sofiaOffsetMinutes(new Date(wall - offset * 60_000));
  const instant = new Date(wall - offset * 60_000);
  const real = sofiaOffsetMinutes(instant);
  const local = new Date(instant.getTime() + real * 60_000);
  const sign = real >= 0 ? "+" : "-";
  const abs = Math.abs(real);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Bulgarian error for a proposed slot, or null when the server will accept the time. */
export function quorumSlotTimeError(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return "Избери дата и час.";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Избери дата и час.";
  if (t <= now.getTime()) return "Часът трябва да е в бъдещето.";
  if (t > now.getTime() + QUORUM_MAX_AHEAD_DAYS * DAY_MS) return `Най-много ${QUORUM_MAX_AHEAD_DAYS} дни напред.`;
  return null;
}

/** "YYYY-MM-DD" of today in Sofia, for the date input's `min`. */
export function sofiaToday(now: Date = new Date()): string {
  const local = new Date(now.getTime() + sofiaOffsetMinutes(now) * 60_000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/** "YYYY-MM-DD" in Sofia, `days` after now, for the date input's `max`. */
export function sofiaDatePlusDays(days: number, now: Date = new Date()): string {
  return sofiaToday(new Date(now.getTime() + days * DAY_MS));
}

/** "пт, 28 ноем." style label for a slot, in Sofia time. */
export function slotDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(
    new Date(iso),
  );
}
