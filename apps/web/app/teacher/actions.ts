"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff, type Role } from "@/lib/roles";
import { isClassroomUrl, isISODate } from "@bunk/core";

const staff = async () => {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = user ? await sb.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  requireStaff(data?.role as Role | undefined);
  return { sb, uid: user!.id };
};
const done = (res?: { error: { message: string } | null }) => {
  if (res?.error) throw new Error(res.error.message);
  revalidatePath("/", "layout");
};
const TIME = /^\d{2}:\d{2}$/;
const check = (ok: boolean, msg: string) => { if (!ok) throw new Error(msg); };
const f = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

export async function cancelClass(section: string, courseCode: string, date: string, start: string, end: string) {
  const { sb, uid } = await staff();
  check(isISODate(date) && TIME.test(start) && TIME.test(end), "Invalid date or time");
  done(await sb.from("schedule_overrides").insert({ section, course_code: courseCode, date, start, end, action: "cancel", created_by: uid }));
}
export async function undoOverride(id: string) {
  const { sb } = await staff();
  done(await sb.from("schedule_overrides").delete().eq("id", id));
}
export async function addExtraClass(form: FormData) {
  const { sb, uid } = await staff();
  check(isISODate(f(form, "date")) && TIME.test(f(form, "start")) && TIME.test(f(form, "end")) && f(form, "start") < f(form, "end"), "Pick a valid date, and an end time after the start");
  done(await sb.from("schedule_overrides").insert({
    section: f(form, "section"), course_code: f(form, "course"), date: f(form, "date"),
    start: f(form, "start"), end: f(form, "end"), room: f(form, "room") || null, action: "extra", created_by: uid,
  }));
}
export async function createEvent(form: FormData) {
  const { sb, uid } = await staff();
  const start = f(form, "start");
  const end = f(form, "end") || start;
  check(isISODate(start) && isISODate(end) && end >= start, "The event must end on or after its start date");
  done(await sb.from("events").insert({ title: f(form, "title"), start_date: start, end_date: end, category: f(form, "category") || "EVENT", source: "app", created_by: uid }));
}
export async function setEventCancelled(id: string, cancelled: boolean) {
  const { sb } = await staff();
  done(await sb.from("events").update({ cancelled }).eq("id", id));
}
export async function postDeadline(form: FormData) {
  const { sb, uid } = await staff();
  check(isISODate(f(form, "due")), "Invalid due date");
  done(await sb.from("deadlines").insert({ title: f(form, "title"), course_code: f(form, "course") || null, due: f(form, "due"), kind: f(form, "kind"), scope: "class", section: f(form, "section"), owner_id: uid }));
}
export async function setClassroomUrl(code: string, form: FormData) {
  const { sb } = await staff();
  const url = f(form, "url");
  check(!url || isClassroomUrl(url), "Only https://classroom.google.com links are allowed");
  done(await sb.from("courses").update({ classroom_url: url || null }).eq("code", code));
}
