import { addDays, overlaps, parseHHMM, toHHMM, weekday } from "./dates";
import type { Deadline, ScheduleOverride, StudyBlock, TimetableSlot } from "./types";

const WINDOWS: [number, number][] = [[parseHHMM("09:00"), parseHHMM("17:00")], [parseHHMM("18:00"), parseHHMM("21:00")]];
const HOURS: Record<Deadline["kind"], number> = { exam: 4, quiz: 2, assignment: 2 };
const MAX_PER_DAY = 180;
const MIN_GAP = 30;
const MIN_BLOCK = 15;

type Range = { start: number; end: number };

const freeRanges = (timetable: TimetableSlot[], date: string, notBefore = 0): Range[] => {
  const busy = timetable
    .filter((t) => t.date === date && !t.cancelled)
    .map((t) => ({ start: parseHHMM(t.start), end: parseHHMM(t.end) }));
  const out: Range[] = [];
  for (const [ws, we] of WINDOWS) {
    let cur = Math.max(ws, notBefore);
    for (const b of busy.filter((b) => b.end > cur && b.start < we).sort((a, b) => a.start - b.start)) {
      if (b.start > cur) out.push({ start: cur, end: Math.min(b.start, we) });
      cur = Math.max(cur, b.end);
    }
    if (cur < we) out.push({ start: cur, end: we });
  }
  return out.filter((r) => r.end - r.start >= MIN_GAP);
};

/** Free study windows on a date. Breaks/lunch count as busy, cancelled classes as free. */
export const freeSlots = (timetable: TimetableSlot[], date: string): { start: string; end: string }[] =>
  freeRanges(timetable, date).map((r) => ({ start: toHHMM(r.start), end: toHHMM(r.end) }));

/** Earliest-deadline-first: fill up to 60-minute blocks before the due date, max 3h/day. */
export const planStudy = (
  timetable: TimetableSlot[], deadlines: Deadline[], today: string, horizonDays = 14, nowMin = 0,
): { blocks: StudyBlock[]; unplaced: { deadlineId: string; hoursShort: number }[] } => {
  const days: Record<string, { free: Range[]; used: number }> = {};
  const dayState = (d: string) =>
    (days[d] ??= { free: freeRanges(timetable, d, d === today ? nowMin : 0), used: 0 });

  const blocks: StudyBlock[] = [];
  const unplaced: { deadlineId: string; hoursShort: number }[] = [];
  const horizonEnd = addDays(today, horizonDays);

  for (const dl of [...deadlines].filter((d) => d.due >= today).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))) {
    let need = HOURS[dl.kind] * 60;
    for (let d = today; d < dl.due && d <= horizonEnd && need > 0; d = addDays(d, 1)) {
      const st = dayState(d);
      for (const r of st.free) {
        while (need > 0 && st.used < MAX_PER_DAY && r.end - r.start >= MIN_BLOCK) {
          const len = Math.min(60, need, r.end - r.start, MAX_PER_DAY - st.used);
          if (len < MIN_BLOCK && len < need) break;
          blocks.push({ date: d, start: toHHMM(r.start), end: toHHMM(r.start + len), deadlineId: dl.id, title: dl.title });
          r.start += len; st.used += len; need -= len;
        }
      }
    }
    if (need > 0) unplaced.push({ deadlineId: dl.id, hoursShort: Math.ceil(need / 60) });
  }
  blocks.sort((a, b) => (a.date === b.date ? parseHHMM(a.start) - parseHHMM(b.start) : a.date < b.date ? -1 : 1));
  return { blocks, unplaced };
};

/** Teacher cancels/extras from `today` on change how many classes are still planned. */
export const adjustPlanned = <S extends { code: string; plannedTotal: number; held: number }>(stats: S[], overrides: ScheduleOverride[], today: string): S[] =>
  stats.map((s) => {
    const delta = overrides.filter((o) => o.courseCode === s.code && o.date >= today)
      .reduce((d, o) => d + (o.action === "extra" ? 1 : -1), 0);
    return { ...s, plannedTotal: Math.max(s.held, s.plannedTotal + delta) };
  });

/** Apply teacher one-off changes: cancel marks the matching slot, extra adds a slot. */
export const mergeOverrides = (slots: TimetableSlot[], overrides: ScheduleOverride[]): TimetableSlot[] => {
  const out = slots.map((s) => ({ ...s }));
  for (const o of overrides) {
    if (o.action === "cancel") {
      for (const s of out) if (s.date === o.date && s.courseCode === o.courseCode && s.start === o.start) s.cancelled = true;
    } else {
      out.push({ date: o.date, start: o.start, end: o.end, courseCode: o.courseCode, kind: "EXTRA", room: o.room, cancelled: false, extra: true });
    }
  }
  return out.sort((a, b) => (a.date === b.date ? parseHHMM(a.start) - parseHHMM(b.start) : a.date < b.date ? -1 : 1));
};

/** One row of a section's official weekly timetable. weekday: 1 = Monday … 6 = Saturday. */
export type TemplateSlot = {
  weekday: number; start: string; end: string;
  /** Course codes this slot can be (electives list several). "OE*" = the student's open elective. Empty for BREAK/LUNCH. */
  options: string[];
  kind: "THEORY" | "LAB" | "TUTORIAL" | "ACTIVITY" | "BREAK" | "LUNCH";
  room: string | null;
};

const resolveOption = (options: string[], enrolled: Set<string>): string | null => {
  for (const o of options) {
    if (o === "OE*") { const oe = [...enrolled].find((c) => c.slice(4, 6) === "OE"); if (oe) return oe; }
    else if (enrolled.has(o)) return o;
  }
  return null;
};

/**
 * Expand the weekly template into dated slots for one student between `from` and `to` (inclusive).
 * Electives resolve to the course the student is enrolled in; activities (non-credit sessions) are always kept;
 * breaks/lunch are dropped where a class the student attends runs through them; no-class dates are skipped.
 */
export const expandTemplate = (template: TemplateSlot[], enrolled: Set<string>, from: string, to: string, noClass: Set<string>): TimetableSlot[] => {
  const out: TimetableSlot[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (noClass.has(d)) continue;
    const rows = template.filter((t) => t.weekday === weekday(d));
    const classes = rows.flatMap((t) => {
      if (t.kind === "BREAK" || t.kind === "LUNCH") return [];
      const code = t.kind === "ACTIVITY" ? t.options[0] ?? null : resolveOption(t.options, enrolled);
      return code ? [{ date: d, start: t.start, end: t.end, courseCode: code, kind: t.kind, room: t.room, cancelled: false, extra: false }] : [];
    });
    const breaks = rows.filter((t) => (t.kind === "BREAK" || t.kind === "LUNCH") && !classes.some((c) => overlaps(c.start, c.end, t.start, t.end)))
      .map((t) => ({ date: d, start: t.start, end: t.end, courseCode: null, kind: t.kind, room: null, cancelled: false, extra: false }));
    out.push(...[...classes, ...breaks].sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start)));
  }
  return out;
};
