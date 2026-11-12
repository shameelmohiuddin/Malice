import { addDays, adjustPlanned, mergeOverrides, shortName, todayIST, type AssistantData, type CourseStats, MIN_ATTENDANCE } from "@classpilot/core";
import { supabase } from "./supabase";
import { getCache, putCache } from "./db";

export type Bundle = AssistantData & {
  profile: { name: string | null; section: string | null; min_attendance: number };
  catalog?: Record<string, { name: string; instructor: string | null; counts: boolean }>;
  advisor?: string | null;
};

/** Full title, short label and whether a code is a non-credit session (not tracked in attendance). */
export const describe = (b: Bundle, code: string | null) => {
  if (!code) return { short: "", full: "", instructor: null as string | null, activity: false };
  const tracked = b.stats.find((x) => x.code === code);
  const entry = b.catalog?.[code];
  const full = tracked?.name ?? entry?.name ?? code;
  const activity = !tracked && entry?.counts === false;
  return { short: activity ? full : shortName(full), full, instructor: entry?.instructor ?? null, activity };
};

/** Pull everything the student screens need into SQLite. Throws if offline. */
export const syncDown = async (userId: string): Promise<void> => {
  const today = todayIST();
  const { data: profile, error } = await supabase.from("profiles").select("name,section,min_attendance").eq("id", userId).single();
  if (error) throw error;
  const section = profile.section ?? "5CS3";
  const [stats, courses, tt, ov, ev, dl, sec] = await Promise.all([
    supabase.from("course_stats").select("*").eq("user_id", userId),
    supabase.from("courses").select("code,name,classroom_url,instructor,counts_attendance"),
    supabase.from("timetable").select("*").eq("user_id", userId).gte("date", addDays(today, -7)).lte("date", addDays(today, 42)),
    supabase.from("schedule_overrides").select("*").eq("section", section),
    supabase.from("events").select("*").order("start_date"),
    supabase.from("deadlines").select("*").order("due"),
    supabase.from("sections").select("class_advisor").eq("section", section).maybeSingle(),
  ]);
  for (const r of [stats, courses, tt, ov, ev, dl]) if (r.error) throw r.error;
  const names = new Map((courses.data ?? []).map((c: any) => [c.code, c.name]));
  const overrides = (ov.data ?? []).map((r: any) => ({ id: r.id, courseCode: r.course_code, date: r.date, start: r.start, end: r.end, action: r.action, room: r.room }));
  const bundle: Bundle = {
    profile, min: Number(profile.min_attendance ?? MIN_ATTENDANCE), advisor: sec.data?.class_advisor ?? null,
    catalog: Object.fromEntries((courses.data ?? []).map((c: any) => [c.code, { name: c.name, instructor: c.instructor ?? null, counts: c.counts_attendance !== false }])),
    names: Object.fromEntries((courses.data ?? []).map((c: any) => [c.code, c.name])),
    stats: adjustPlanned((stats.data ?? []).map((r: any): CourseStats => ({ code: r.course_code, name: names.get(r.course_code) ?? r.course_code, present: r.present, held: r.held, plannedTotal: r.planned_total })), overrides, today),
    timetable: mergeOverrides(
      (tt.data ?? []).map((r: any) => ({ date: r.date, start: r.start, end: r.end, courseCode: r.course_code, kind: r.kind, room: r.room, cancelled: r.cancelled, extra: false })),
      overrides,
    ),
    events: (ev.data ?? []).map((r: any) => ({ id: r.id, title: r.title, start: r.start_date, end: r.end_date, category: r.category, isHoliday: r.is_holiday, cancelled: r.cancelled })),
    deadlines: (dl.data ?? []).filter((r: any) => r.scope === "personal" || !r.section || r.section === section)
      .map((r: any) => ({ id: r.id, courseCode: r.course_code, title: r.title, due: r.due, kind: r.kind })),
    classroom: Object.fromEntries((courses.data ?? []).filter((c: any) => c.classroom_url).map((c: any) => [c.code, c.classroom_url])),
  };
  await putCache("bundle", bundle);
};

/** Screens read only from here, so they work offline. */
export const loadBundle = () => getCache<Bundle>("bundle");
