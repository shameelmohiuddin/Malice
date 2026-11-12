import { addDays, mergeOverrides, todayIST, type AssistantData, type CourseStats } from "@bunk/core";
import { supabase } from "./supabase";
import { getCache, putCache } from "./db";

export type Bundle = AssistantData & { profile: { name: string | null; section: string | null; min_attendance: number } };

/** Pull everything the student screens need into SQLite. Throws if offline. */
export const syncDown = async (userId: string): Promise<void> => {
  const today = todayIST();
  const { data: profile, error } = await supabase.from("profiles").select("name,section,min_attendance").eq("id", userId).single();
  if (error) throw error;
  const section = profile.section ?? "5CS3";
  const [stats, courses, tt, ov, ev, dl] = await Promise.all([
    supabase.from("course_stats").select("*").eq("user_id", userId),
    supabase.from("courses").select("code,name,classroom_url"),
    supabase.from("timetable").select("*").eq("user_id", userId).gte("date", addDays(today, -7)).lte("date", addDays(today, 42)),
    supabase.from("schedule_overrides").select("*").eq("section", section),
    supabase.from("events").select("*").order("start_date"),
    supabase.from("deadlines").select("*").order("due"),
  ]);
  for (const r of [stats, courses, tt, ov, ev, dl]) if (r.error) throw r.error;
  const names = new Map((courses.data ?? []).map((c: any) => [c.code, c.name]));
  const bundle: Bundle = {
    profile,
    stats: (stats.data ?? []).map((r: any): CourseStats => ({ code: r.course_code, name: names.get(r.course_code) ?? r.course_code, present: r.present, held: r.held, plannedTotal: r.planned_total })),
    timetable: mergeOverrides(
      (tt.data ?? []).map((r: any) => ({ date: r.date, start: r.start, end: r.end, courseCode: r.course_code, kind: r.kind, room: r.room, cancelled: r.cancelled, extra: false })),
      (ov.data ?? []).map((r: any) => ({ id: r.id, courseCode: r.course_code, date: r.date, start: r.start, end: r.end, action: r.action, room: r.room })),
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
