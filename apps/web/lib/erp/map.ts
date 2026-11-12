import { addDays, expandTemplate, weekday, type CalendarEvent, type CourseStats, type TemplateSlot, type TimetableSlot } from "@classpilot/core";
import type { ErpRaw } from "./types";

export type LogRow = { erpLogId: number; courseCode: string; date: string; start: string; end: string; status: "PRESENT" | "ABSENT" };
export type Mapped = {
  courses: { code: string; name: string }[];
  logs: LogRow[];
  timetable: (TimetableSlot & { erpEntryId: number | null; section: string })[];
  events: (CalendarEvent & { erpEventId: number })[];
  stats: CourseStats[];
  semester: { start: string; end: string };
};

const hhmm = (t: string) => t.slice(0, 5);
const PATTERN_WINDOW_DAYS = 35;
const NO_CLASS_CODES = new Set(["CONTINUOUS_INTERNAL_EVALUATION", "LAB_TEST"]);

export const mapErp = (raw: ErpRaw, today: string, template: TemplateSlot[] = []): Mapped => {
  const semStart = raw.events.find((e) => e.event_code === "CLASS_START")?.start_date ?? addDays(today, -60);
  const semEnd = raw.events.find((e) => e.event_code === "CLASS_END")?.start_date ?? addDays(today, 60);

  const noClass = new Set<string>();
  for (const e of raw.events)
    if (e.is_holiday || e.is_class_suspended || (e.event_code && NO_CLASS_CODES.has(e.event_code)))
      for (let d = e.start_date; d <= e.end_date; d = addDays(d, 1)) noClass.add(d);

  const logs: LogRow[] = raw.courses.flatMap((c) =>
    c.logs.filter((l) => l.attendanceEligible && !l.isSwappedAway).map((l) => ({
      erpLogId: l.logId, courseCode: c.courseCode, date: l.sessionDate, start: hhmm(l.startTime), end: hhmm(l.endTime), status: l.attendanceStatus,
    })));

  // Weekly pattern: (weekday, start, end, course) seen at least twice in the last 5 weeks.
  const from = addDays(today, -PATTERN_WINDOW_DAYS);
  const seen = new Map<string, number>();
  for (const l of logs) if (l.date >= from && l.date < today) {
    const k = `${weekday(l.date)}|${l.start}|${l.end}|${l.courseCode}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const pattern = [...seen].filter(([, n]) => n >= 2).map(([k]) => {
    const [wd, start, end, courseCode] = k.split("|");
    return { wd: +wd, start, end, courseCode };
  });

  const section = raw.student.section;
  const slot = (date: string, start: string, end: string, courseCode: string | null, kind: string, room: string | null, cancelled = false, erpEntryId: number | null = null) =>
    ({ date, start, end, courseCode, kind, room, cancelled, extra: false, erpEntryId, section });

  const timetable: Mapped["timetable"] = [];
  const enrolled = new Set(raw.courses.map((c) => c.courseCode));
  // Past: classes from attendance logs (the truth), with kind and room from the official template where it matches.
  for (const l of logs) {
    const tpl = template.find((t) => t.weekday === weekday(l.date) && t.start === l.start && (t.options.includes(l.courseCode) || (t.options.includes("OE*") && l.courseCode.slice(4, 6) === "OE")));
    timetable.push(slot(l.date, l.start, l.end, l.courseCode, tpl?.kind ?? "THEORY", tpl?.room ?? null));
  }
  // Past: non-credit sessions and breaks from the template (the ERP doesn't log them).
  if (template.length)
    for (const t of expandTemplate(template, enrolled, semStart, addDays(today, -1), noClass))
      if (t.kind === "ACTIVITY" || !t.courseCode) timetable.push(slot(t.date, t.start, t.end, t.courseCode, t.kind, t.room));
  // ERP-published entries (today and any future days the ERP returns).
  const erpDates = new Set(raw.timetable.map((t) => t.sessionDate));
  for (const t of raw.timetable)
    timetable.push(slot(t.sessionDate, hhmm(t.startTime), hhmm(t.endTime), t.course?.courseCode ?? null, t.logType?.[0] ?? "THEORY", t.room?.roomCode ?? null, !!t.isCancelled, t.entryId));
  // Future days the ERP hasn't published: the section's official timetable, else the weekly pattern seen in logs.
  if (template.length) {
    for (const t of expandTemplate(template, enrolled, today, semEnd, noClass))
      if (!erpDates.has(t.date) && !logs.some((l) => l.date === t.date && l.start === t.start && l.courseCode === t.courseCode))
        timetable.push(slot(t.date, t.start, t.end, t.courseCode, t.kind, t.room));
  } else for (let d = today; d <= semEnd; d = addDays(d, 1)) {
    if (erpDates.has(d) || noClass.has(d)) continue;
    const day = pattern.filter((p) => p.wd === weekday(d));
    if (!day.length) continue;
    timetable.push(slot(d, "09:55", "10:15", null, "BREAK", null), slot(d, "12:05", "12:50", null, "LUNCH", null));
    for (const p of day) if (!logs.some((l) => l.date === d && l.start === p.start && l.courseCode === p.courseCode))
      timetable.push(slot(d, p.start, p.end, p.courseCode, "THEORY", null));
  }
  // Dedupe by (date, start): ERP entries win over log-derived rows.
  const byKey = new Map<string, Mapped["timetable"][number]>();
  for (const t of timetable) {
    const k = `${t.date}|${t.start}`;
    const prev = byKey.get(k);
    if (!prev || (t.erpEntryId && !prev.erpEntryId)) byKey.set(k, t);
  }
  const tt = [...byKey.values()].sort((a, b) => (a.date === b.date ? (a.start < b.start ? -1 : 1) : a.date < b.date ? -1 : 1));

  const future = (code: string) =>
    tt.filter((t) => t.courseCode === code && !t.cancelled && t.date >= today && !logs.some((l) => l.date === t.date && l.start === t.start && l.courseCode === code)).length;

  const stats: CourseStats[] = raw.courses.map((c) => ({
    code: c.courseCode, name: c.courseName, present: c.presentCount, held: c.totalEligible,
    plannedTotal: c.totalEligible + future(c.courseCode),
  }));

  const events = raw.events.map((e) => ({
    id: `erp-${e.event_id}`, erpEventId: e.event_id, title: e.event_title, start: e.start_date, end: e.end_date,
    category: e.category_name, isHoliday: e.is_holiday, cancelled: false,
  }));

  return { courses: raw.courses.map((c) => ({ code: c.courseCode, name: c.courseName })), logs, timetable: tt, events, stats, semester: { start: semStart, end: semEnd } };
};
