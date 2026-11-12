// All dates are IST calendar dates as "YYYY-MM-DD". Arithmetic happens on UTC-midnight Dates.
const IST_OFFSET_MIN = 330;

const toUTC = (d: string): Date => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};
const fmt = (dt: Date): string => dt.toISOString().slice(0, 10);

export const todayIST = (now: Date = new Date()): string =>
  fmt(new Date(now.getTime() + IST_OFFSET_MIN * 60_000));

export const nowMinutesIST = (now: Date = new Date()): number => {
  const t = new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
};

export const addDays = (d: string, n: number): string => {
  const dt = toUTC(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmt(dt);
};

export const weekday = (d: string): number => toUTC(d).getUTCDay();

/** Next date strictly after `from` that falls on weekday `wd` (0=Sun). */
export const nextWeekday = (from: string, wd: number): string => {
  const diff = (wd - weekday(from) + 7) % 7 || 7;
  return addDays(from, diff);
};

export const parseHHMM = (s: string): number => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

export const toHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const daysBetween = (a: string, b: string): number =>
  Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);

export const isISODate = (s: unknown): s is string => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return fmt(toUTC(s)) === s;
};

export const isClassroomUrl = (s: unknown): s is string => {
  try { const u = new URL(String(s)); return u.protocol === "https:" && u.hostname === "classroom.google.com"; } catch { return false; }
};

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
