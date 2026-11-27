/**
 * Client-side labels computed from `startsAt` in Europe/Sofia time. The server
 * stores only the timestamp; these replace the old stored dateLabel/timeBucket.
 */
const TZ = 'Europe/Sofia';

function sofiaParts(d: Date): { y: number; m: number; day: number; hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    weekday: weekdays.indexOf(get('weekday')),
  };
}

function dayNumber(p: { y: number; m: number; day: number }): number {
  return Math.floor(Date.UTC(p.y, p.m - 1, p.day) / 86_400_000);
}

export type DateLabel = 'днес' | 'утре' | 'уикенда' | 'тази седмица' | 'по-късно' | 'минала';
export type TimeBucket = 'ранен вечер' | 'вечер' | 'късно' | 'през деня';

export function dateLabel(startsAt: string | Date, now: Date = new Date()): DateLabel {
  const s = sofiaParts(new Date(startsAt));
  const n = sofiaParts(now);
  const diff = dayNumber(s) - dayNumber(n);
  if (diff < 0) return 'минала';
  if (diff === 0) return 'днес';
  if (diff === 1) return 'утре';
  // Days until the coming Sunday (0 when today is Sunday).
  const toSunday = (7 - n.weekday) % 7;
  if (diff <= toSunday && (s.weekday === 6 || s.weekday === 0 || s.weekday === 5)) return 'уикенда';
  if (diff <= toSunday) return 'тази седмица';
  return 'по-късно';
}

export function timeBucket(startsAt: string | Date): TimeBucket {
  const { hour } = sofiaParts(new Date(startsAt));
  if (hour >= 17 && hour < 19) return 'ранен вечер';
  if (hour >= 19 && hour < 22) return 'вечер';
  if (hour >= 22 || hour < 4) return 'късно';
  return 'през деня';
}

/** "HH:mm" in Sofia time. */
export function sofiaTime(startsAt: string | Date): string {
  return new Intl.DateTimeFormat('bg-BG', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(startsAt),
  );
}

/** "YYYY-MM-DD" in Sofia time. */
export function sofiaDate(startsAt: string | Date): string {
  const p = sofiaParts(new Date(startsAt));
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
