import type { Advice, CourseStats } from "./types";

export const MIN_ATTENDANCE = 0.75;
const r1 = (x: number) => Math.round(x * 10) / 10;

export const pct = (present: number, held: number): number =>
  held === 0 ? 100 : r1((present / held) * 100);

export const costOfMiss = (present: number, held: number) => {
  const before = pct(present, held);
  const after = r1((present / (held + 1)) * 100);
  return { before, after, drop: r1(before - after) };
};

export const safeToMiss = (present: number, held: number, min = MIN_ATTENDANCE): number =>
  Math.max(0, Math.floor((present - min * held) / min + 1e-9));

export const mustAttend = (present: number, held: number, min = MIN_ATTENDANCE): number =>
  Math.max(0, Math.ceil((min * held - present) / (1 - min) - 1e-9));

export const projection = (s: CourseStats, min = MIN_ATTENDANCE) => {
  const total = Math.max(s.plannedTotal, s.held);
  const remaining = Math.max(0, total - s.held);
  return {
    remaining,
    canMissRemaining: Math.max(0, Math.floor(s.present + remaining - min * total + 1e-9)),
    finalIfAllAttended: pct(s.present + remaining, total),
  };
};

export const classAdvice = (s: CourseStats, hasDeadlineThatDay: boolean, min = MIN_ATTENDANCE): Advice => {
  const { after } = costOfMiss(s.present, s.held);
  if (hasDeadlineThatDay || after < min * 100) return "must";
  if (after < min * 100 + 5) return "risky";
  return "safe";
};

export const overall = (stats: CourseStats[]): CourseStats =>
  stats.reduce(
    (a, s) => ({ ...a, present: a.present + s.present, held: a.held + s.held, plannedTotal: a.plannedTotal + s.plannedTotal }),
    { code: "ALL", name: "Overall", present: 0, held: 0, plannedTotal: 0 },
  );
