import "server-only";
import { isClassroomUrl, isISODate } from "@classpilot/core";
import { requireStaff } from "@/lib/roles";
import type { Ctx } from "@/lib/data";
import { ValidationError, validateDeadline, validateEvent, validateExtra, validateCancel } from "@/lib/validate";

const ok = (res: { error: { message: string } | null }) => { if (res.error) throw new Error(res.error.message); };
const staff = (ctx: Ctx) => { requireStaff(ctx.profile?.role); return { sb: ctx.supabase, uid: ctx.user.id }; };

export const teacher = {
  async dayClasses(ctx: Ctx, section: string, date: string) {
    const { sb } = staff(ctx);
    if (!isISODate(date)) throw new ValidationError("Invalid date");
    const [tt, ov, courses] = await Promise.all([
      sb.from("timetable").select("date,start,end,course_code,room").eq("section", section).eq("date", date).not("course_code", "is", null).order("start"),
      sb.from("schedule_overrides").select("*").eq("section", section).eq("date", date),
      sb.from("courses").select("code,name"),
    ]);
    const seen = new Set<string>();
    return (tt.data ?? []).filter((t) => { const k = t.start + t.course_code; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((t) => {
        const cancel = ov.data?.find((o) => o.action === "cancel" && o.start === t.start && o.course_code === t.course_code);
        return { date, start: t.start, end: t.end, courseCode: t.course_code, courseName: courses.data?.find((c) => c.code === t.course_code)?.name ?? t.course_code, room: t.room, cancelled: !!cancel, overrideId: cancel?.id ?? null };
      })
      .concat((ov.data ?? []).filter((o) => o.action === "extra").map((o) => ({ date, start: o.start, end: o.end, courseCode: o.course_code, courseName: courses.data?.find((c) => c.code === o.course_code)?.name ?? o.course_code, room: o.room, cancelled: false, overrideId: o.id, extra: true } as any)));
  },
  async cancelClass(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateCancel(input);
    ok(await sb.from("schedule_overrides").insert({ section: v.section, course_code: v.courseCode, date: v.date, start: v.start, end: v.end, action: "cancel", created_by: uid }));
  },
  async addExtraClass(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateExtra(input);
    ok(await sb.from("schedule_overrides").insert({ section: v.section, course_code: v.courseCode, date: v.date, start: v.start, end: v.end, room: v.room, action: "extra", created_by: uid }));
  },
  async undoOverride(ctx: Ctx, id: string) {
    const { sb } = staff(ctx);
    ok(await sb.from("schedule_overrides").delete().eq("id", id));
  },
  async createEvent(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateEvent(input);
    ok(await sb.from("events").insert({ title: v.title, start_date: v.start, end_date: v.end, category: v.category, source: "app", created_by: uid }));
  },
  async setEventCancelled(ctx: Ctx, id: string, cancelled: boolean) {
    const { sb } = staff(ctx);
    ok(await sb.from("events").update({ cancelled }).eq("id", id).eq("source", "app"));
  },
  async postDeadline(ctx: Ctx, input: unknown) {
    const { sb, uid } = staff(ctx);
    const v = validateDeadline(input);
    ok(await sb.from("deadlines").insert({ title: v.title, course_code: v.courseCode, due: v.due, kind: v.kind, scope: "class", section: v.section, owner_id: uid }));
  },
  async setClassroomUrl(ctx: Ctx, code: string, url: string | null) {
    const { sb } = staff(ctx);
    if (url && !isClassroomUrl(url)) throw new ValidationError("Only https://classroom.google.com links are allowed");
    ok(await sb.from("courses").update({ classroom_url: url || null }).eq("code", code));
  },
};
