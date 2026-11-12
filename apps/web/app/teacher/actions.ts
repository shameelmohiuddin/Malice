"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff, type Role } from "@/lib/roles";

const staff = async () => {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data } = user ? await sb.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  requireStaff(data?.role as Role | undefined);
  return { sb, uid: user!.id };
};
const done = () => revalidatePath("/", "layout");
const f = (form: FormData, k: string) => String(form.get(k) ?? "").trim();

export async function cancelClass(section: string, courseCode: string, date: string, start: string, end: string) {
  const { sb, uid } = await staff();
  await sb.from("schedule_overrides").insert({ section, course_code: courseCode, date, start, end, action: "cancel", created_by: uid });
  done();
}
export async function undoOverride(id: string) {
  const { sb } = await staff();
  await sb.from("schedule_overrides").delete().eq("id", id);
  done();
}
export async function addExtraClass(form: FormData) {
  const { sb, uid } = await staff();
  await sb.from("schedule_overrides").insert({
    section: f(form, "section"), course_code: f(form, "course"), date: f(form, "date"),
    start: f(form, "start"), end: f(form, "end"), room: f(form, "room") || null, action: "extra", created_by: uid,
  });
  done();
}
export async function createEvent(form: FormData) {
  const { sb, uid } = await staff();
  const start = f(form, "start");
  await sb.from("events").insert({ title: f(form, "title"), start_date: start, end_date: f(form, "end") || start, category: f(form, "category") || "EVENT", source: "app", created_by: uid });
  done();
}
export async function setEventCancelled(id: string, cancelled: boolean) {
  const { sb } = await staff();
  await sb.from("events").update({ cancelled }).eq("id", id);
  done();
}
export async function postDeadline(form: FormData) {
  const { sb, uid } = await staff();
  await sb.from("deadlines").insert({ title: f(form, "title"), course_code: f(form, "course") || null, due: f(form, "due"), kind: f(form, "kind"), scope: "class", section: f(form, "section"), owner_id: uid });
  done();
}
export async function setClassroomUrl(code: string, form: FormData) {
  const { sb } = await staff();
  await sb.from("courses").update({ classroom_url: f(form, "url") || null }).eq("code", code);
  done();
}
