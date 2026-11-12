// View-models: everything a UI needs, computed once, so any frontend (web, mobile, new design) just renders.
import { classAdvice, costOfMiss, mustAttend, overall, pct, projection, safeToMiss } from "./attendance";
import { parseHHMM } from "./dates";
import type { Advice, CourseStats, Deadline, TimetableSlot } from "./types";

export type CourseView = CourseStats & {
  percent: number; advice: Advice; canSkip: number; mustAttend: number;
  skipNext: { before: number; after: number; drop: number };
  semester: { remaining: number; canMissRemaining: number; finalIfAllAttended: number };
};

export const courseView = (s: CourseStats, o: { min: number; deadlineToday: boolean }): CourseView => ({
  ...s,
  percent: pct(s.present, s.held),
  advice: classAdvice(s, o.deadlineToday, o.min),
  canSkip: safeToMiss(s.present, s.held, o.min),
  mustAttend: mustAttend(s.present, s.held, o.min),
  skipNext: costOfMiss(s.present, s.held),
  semester: projection(s, o.min),
});

export type TodayClass = TimetableSlot & { courseName: string; advice: Advice | null };

export type DashboardView = {
  overall: { present: number; held: number; percent: number };
  nearLimit: number;
  courses: CourseView[];
  today: TodayClass[];
};

export const dashboardView = (i: { stats: CourseStats[]; timetable: TimetableSlot[]; deadlines: Deadline[]; today: string; min: number }): DashboardView => {
  const due = (code: string, date: string) => i.deadlines.some((d) => d.due === date && d.courseCode === code);
  const courses = i.stats.map((s) => courseView(s, { min: i.min, deadlineToday: due(s.code, i.today) })).sort((a, b) => a.percent - b.percent);
  const o = overall(i.stats);
  const today = i.timetable
    .filter((t) => t.date === i.today && t.courseCode)
    .sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start))
    .map((t) => {
      const c = courses.find((x) => x.code === t.courseCode);
      return { ...t, courseName: c?.name ?? t.courseCode!, advice: t.cancelled || !c ? null : c.advice };
    });
  return {
    overall: { present: o.present, held: o.held, percent: pct(o.present, o.held) },
    nearLimit: courses.filter((c) => c.percent < i.min * 100 + 5).length,
    courses, today,
  };
};

/** Seconds until another ERP sync is allowed (protects the college ERP from hammering). */
export const syncCooldownLeft = (lastSync: string | null, now: Date, cooldownSec: number): number => {
  if (!lastSync) return 0;
  const left = cooldownSec - Math.floor((now.getTime() - new Date(lastSync).getTime()) / 1000);
  return Math.max(0, left);
};
