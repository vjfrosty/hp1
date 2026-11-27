/**
 * Turns a wall-clock date and time typed in Bulgaria into an ISO timestamp
 * with the correct Europe/Sofia offset (+02:00 in winter, +03:00 in summer).
 *
 * `date` is "YYYY-MM-DD" (an <input type="date"> value), `time` is "HH:mm".
 * Returns null when either part is malformed. A time skipped by the spring
 * DST jump (03:00–03:59 on the last Sunday of March) resolves one hour later.
 */
const TZ = "Europe/Sofia";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Sofia's UTC offset in minutes at the instant `utcMs`. */
function sofiaOffsetMinutes(utcMs: number): number {
  const parts = formatter.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((wall - Math.floor(utcMs / 60_000) * 60_000) / 60_000);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function sofiaLocalToIso(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, day, h, mi] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (mo < 1 || mo > 12 || day < 1 || day > 31 || h > 23 || mi > 59) return null;

  const wallAsUtc = Date.UTC(y, mo - 1, day, h, mi);
  const check = new Date(wallAsUtc);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== day) return null; // e.g. 31 February

  // Guess with the offset at the wall time, then correct once for DST edges.
  let offset = sofiaOffsetMinutes(wallAsUtc);
  const second = sofiaOffsetMinutes(wallAsUtc - offset * 60_000);
  if (second !== offset) offset = second;
  const utcMs = wallAsUtc - offset * 60_000;

  // Express the instant in Sofia wall time with its real offset.
  const realOffset = sofiaOffsetMinutes(utcMs);
  const local = new Date(utcMs + realOffset * 60_000);
  const sign = realOffset >= 0 ? "+" : "-";
  const abs = Math.abs(realOffset);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
