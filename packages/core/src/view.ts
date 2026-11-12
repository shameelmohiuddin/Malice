// View-models: everything a UI needs, computed once, so any frontend (web, mobile, new design) just renders.
import { classAdvice, costOfMiss, mustAttend, overall, pct, projection, safeToMiss, FLOOR_ATTENDANCE } from "./attendance";
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

export type TodayClass = TimetableSlot & { courseName: string; advice: Advice | null; past: boolean };

export type DashboardView = {
  overall: { present: number; held: number; percent: number };
  nearLimit: number;
  courses: CourseView[];
  today: TodayClass[];
};

export const dashboardView = (i: { stats: CourseStats[]; timetable: TimetableSlot[]; deadlines: Deadline[]; today: string; min: number; nowMin?: number }): DashboardView => {
  const due = (code: string, date: string) => i.deadlines.some((d) => d.due === date && d.courseCode === code);
  const courses = i.stats.map((s) => courseView(s, { min: i.min, deadlineToday: due(s.code, i.today) })).sort((a, b) => a.percent - b.percent);
  const o = overall(i.stats);
  const today = i.timetable
    .filter((t) => t.date === i.today && t.courseCode)
    .sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start))
    .map((t) => {
      const c = courses.find((x) => x.code === t.courseCode);
      const past = i.nowMin !== undefined && parseHHMM(t.end) <= i.nowMin;
      return { ...t, courseName: c?.name ?? t.courseCode!, past, advice: t.cancelled || past || !c ? null : c.advice };
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

/** "Database Management System" → "DBMS", "Computer Networks Laboratory" → "CN LAB". One-word names stay whole. */
export const shortName = (name: string): string => {
  const words = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)
    .filter((w) => w && !["and", "of", "the", "for", "in", "to", "a"].includes(w) && !/^(i|ii|iii|iv|v|vi)$/.test(w));
  if (words.length < 2) return name;
  const lab = words[words.length - 1] === "laboratory" || words[words.length - 1] === "lab";
  const core = lab ? words.slice(0, -1) : words;
  const acr = core.map((w) => (w === "database" ? "db" : w[0])).join("").toUpperCase();
  return core.length < 2 ? name : lab ? `${acr} LAB` : acr;
};

export type AttendanceStatus = "clear" | "close" | "condonation" | "below";
/** Standing: under the 75% floor (not eligible), under the minimum (condonation zone), within 5 points of it, or clear. */
export const attendanceStatus = (percent: number, min: number): AttendanceStatus =>
  percent < FLOOR_ATTENDANCE * 100 ? "below" : percent < min * 100 ? "condonation" : percent < min * 100 + 5 ? "close" : "clear";
