import "server-only";
import { addDays, mergeOverrides, todayIST, type AssistantData, type CalendarEvent, type CourseStats, type Deadline, type ScheduleOverride, type TimetableSlot } from "@bunk/core";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export type Profile = { id: string; name: string | null; role: Role; section: string | null; min_attendance: number };

export const getSession = async () => {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id,name,role,section,min_attendance").eq("id", user.id).single();
  return { supabase, user, profile: profile as Profile };
};

type Row = Record<string, any>;
export const toSlot = (r: Row): TimetableSlot => ({ date: r.date, start: r.start, end: r.end, courseCode: r.course_code, kind: r.kind, room: r.room, cancelled: r.cancelled, extra: false });
export const toOverride = (r: Row): ScheduleOverride => ({ id: r.id, courseCode: r.course_code, date: r.date, start: r.start, end: r.end, action: r.action, room: r.room });
export const toEvent = (r: Row): CalendarEvent => ({ id: r.id, title: r.title, start: r.start_date, end: r.end_date, category: r.category, isHoliday: r.is_holiday, cancelled: r.cancelled });
export const toDeadline = (r: Row): Deadline & { scope: string } => ({ id: r.id, courseCode: r.course_code, title: r.title, due: r.due, kind: r.kind, scope: r.scope });

export type StudentData = Omit<AssistantData, "deadlines"> & {
  profile: Profile; today: string; courses: { code: string; name: string }[];
  deadlines: (Deadline & { scope: string })[]; lastSync: string | null; lastError: string | null; hasCreds: boolean;
};

export const loadStudentData = async (): Promise<StudentData> => {
  const { supabase, user, profile } = await getSession();
  const today = todayIST();
  const section = profile.section ?? "5CS3";
  const [stats, courses, tt, ov, ev, dl, creds] = await Promise.all([
    supabase.from("course_stats").select("*").eq("user_id", user.id),
    supabase.from("courses").select("code,name,classroom_url"),
    supabase.from("timetable").select("*").eq("user_id", user.id).gte("date", addDays(today, -14)).lte("date", addDays(today, 42)).order("date").order("start"),
    supabase.from("schedule_overrides").select("*").eq("section", section),
    supabase.from("events").select("*").order("start_date"),
    supabase.from("deadlines").select("*").order("due"),
    supabase.from("erp_credentials").select("last_sync,last_error").eq("user_id", user.id).maybeSingle(),
  ]);
  const names = new Map((courses.data ?? []).map((c) => [c.code, c.name]));
  const s: CourseStats[] = (stats.data ?? []).map((r) => ({ code: r.course_code, name: names.get(r.course_code) ?? r.course_code, present: r.present, held: r.held, plannedTotal: r.planned_total }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const mine = new Set(s.map((x) => x.code));
  return {
    profile, today,
    stats: s,
    courses: (courses.data ?? []).filter((c) => mine.has(c.code)).map((c) => ({ code: c.code, name: c.name })),
    timetable: mergeOverrides((tt.data ?? []).map(toSlot), (ov.data ?? []).map(toOverride)),
    events: (ev.data ?? []).map(toEvent),
    deadlines: (dl.data ?? []).filter((d) => d.scope === "personal" || !d.section || d.section === section).map(toDeadline),
    classroom: Object.fromEntries((courses.data ?? []).filter((c) => c.classroom_url).map((c) => [c.code, c.classroom_url])),
    lastSync: creds.data?.last_sync ?? null, lastError: creds.data?.last_error ?? null, hasCreds: !!creds.data,
  };
};
