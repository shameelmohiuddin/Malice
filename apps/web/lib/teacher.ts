import "server-only";
import { isClassroomUrl, isISODate, nowMinutesIST, overlaps, parseHHMM, todayIST } from "@classpilot/core";
import { dbError, NotFoundError } from "@/lib/errors";
import { requireStaff } from "@/lib/roles";
import type { Ctx } from "@/lib/data";
import { ValidationError, validateDeadline, validateEvent, validateExtra, validateCancel } from "@/lib/validate";

const ok = (res: { error: { code?: string; message: string } | null }, dup?: string) => { if (res.error) throw dbError(res.error, dup); };

/** The section's real classes on a date (from any student's synced timetable) plus extras already added. */
const sectionDay = async (sb: Ctx["supabase"], section: string, date: string) => {
  const [tt, ov] = await Promise.all([
    sb.from("timetable").select("start,end,course_code").eq("section", section).eq("date", date).not("course_code", "is", null),
    sb.from("schedule_overrides").select("start,end,course_code,action").eq("section", section).eq("date", date),
  ]);
  const cancelled = new Set((ov.data ?? []).filter((o) => o.action === "cancel").map((o) => o.start + o.course_code));
  const seen = new Set<string>();
  const classes = (tt.data ?? []).filter((t) => { const k = t.start + t.course_code; if (seen.has(k)) return false; seen.add(k); return true; });
  const extras = (ov.data ?? []).filter((o) => o.action === "extra");
  return { classes, extras, cancelled };
};
/** One class on the teacher's day list: a timetabled class (cancellable) or an extra class (undoable). */
export type DayClass = {
  date: string; start: string; end: string; courseCode: string; courseName: string; room: string | null;
  cancelled: boolean; overrideId: string | null; extra?: boolean;
};

const staff = (ctx: Ctx) => { requireStaff(ctx.profile?.role); return { sb: ctx.supabase, uid: ctx.user.id }; };

export const teacher = {
  async dayClasses(ctx: Ctx, section: string, date: string): Promise<DayClass[]> {
    const { sb } = staff(ctx);
    if (!isISODate(date)) throw new ValidationError("Invalid date");
    const [tt, ov, courses] = await Promise.all([
      sb.from("timetable").select("date,start,end,course_code,room").eq("section", section).eq("date", date).not("course_code", "is", null).order("start"),
      sb.from("schedule_overrides").select("*").eq("section", section).eq("date", date),
      sb.from("courses").select("code,name"),
    ]);
    const seen = new Set<string>();
    return (tt.data ?? []).filter((t) => { const k = t.start + t.course_code; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((t): DayClass => {
        const cancel = ov.data?.find((o) => o.action === "cancel" && o.start === t.start && o.course_code === t.course_code);
        return { date, start: t.start, end: t.end, courseCode: t.course_code, courseName: courses.data?.find((c) => c.code === t.course_code)?.name ?? t.course_code, room: t.room, cancelled: !!cancel, overrideId: cancel?.id ?? null };
      })
      .concat((ov.data ?? []).filter((o) => o.action === "extra").map((o) => ({ date, start: o.start, end: o.end, courseCode: o.course_code, courseName: courses.data?.find((c) => c.code === o.course_code)?.name ?? o.course_code, room: o.room, cancelled: false, overrideId: o.id, extra: true })))
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  },
  async cancelClass(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateCancel(input);
    const today = todayIST();
    if (v.date < today || (v.date === today && parseHHMM(v.end) <= nowMinutesIST()))
      throw new ValidationError("That class has already happened, so it can't be cancelled");
    const day = await sectionDay(sb, v.section, v.date);
    if (!day.classes.some((c) => c.start === v.start && c.course_code === v.courseCode))
      throw new ValidationError(`There's no ${v.courseCode} class at ${v.start} on ${v.date} for ${v.section}`);
    ok(await sb.from("schedule_overrides").insert({ section: v.section, course_code: v.courseCode, date: v.date, start: v.start, end: v.end, action: "cancel", created_by: uid }), "That class is already cancelled");
  },
  async addExtraClass(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateExtra(input);
    const day = await sectionDay(sb, v.section, v.date);
    const clash = [...day.classes.filter((c) => !day.cancelled.has(c.start + c.course_code)), ...day.extras]
      .find((c) => overlaps(c.start, c.end, v.start, v.end));
    if (clash) throw new ValidationError(`Clashes with ${clash.course_code} at ${clash.start}–${clash.end}`);
    ok(await sb.from("schedule_overrides").insert({ section: v.section, course_code: v.courseCode, date: v.date, start: v.start, end: v.end, room: v.room, action: "extra", created_by: uid }), "That extra class already exists");
  },
  async undoOverride(ctx: Ctx, id: string) {
    const { sb } = staff(ctx);
    const res = await sb.from("schedule_overrides").delete().eq("id", id).select("id");
    ok(res);
    if (!res.data?.length) throw new NotFoundError("No such schedule change");
  },
  async createEvent(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateEvent(input);
    ok(await sb.from("events").insert({ title: v.title, start_date: v.start, end_date: v.end, category: v.category, source: "app", created_by: uid }));
  },
  async setEventCancelled(ctx: Ctx, id: string, cancelled: boolean) {
    const { sb } = staff(ctx);
    const res = await sb.from("events").update({ cancelled }).eq("id", id).eq("source", "app").select("id");
    ok(res);
    if (!res.data?.length) throw new NotFoundError("No such app event (ERP calendar events can't be changed here)");
  },
  async postDeadline(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateDeadline(input);
    ok(await sb.from("deadlines").insert({ title: v.title, course_code: v.courseCode, due: v.due, kind: v.kind, scope: "class", section: v.section, owner_id: uid }));
  },
  async setClassroomUrl(ctx: Ctx, code: string, url: string | null) {
    const { sb } = staff(ctx);
    if (url && !isClassroomUrl(url)) throw new ValidationError("Only https://classroom.google.com links are allowed");
    const res = await sb.from("courses").update({ classroom_url: url || null }).eq("code", code).select("code");
    ok(res);
    if (!res.data?.length) throw new NotFoundError(`No course ${code}`);
  },
};
