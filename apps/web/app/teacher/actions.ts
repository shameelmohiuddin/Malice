"use server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/data";
import { teacher } from "@/lib/teacher";

const f = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const run = async (fn: (ctx: Awaited<ReturnType<typeof getSession>>) => Promise<void>) => {
  await fn(await getSession());
  revalidatePath("/", "layout");
};

export async function cancelClass(section: string, courseCode: string, date: string, start: string, end: string) {
  await run((c) => teacher.cancelClass(c, { section, courseCode, date, start, end }));
}
export async function undoOverride(id: string) { await run((c) => teacher.undoOverride(c, id)); }
export async function addExtraClass(form: FormData) {
  await run((c) => teacher.addExtraClass(c, { section: f(form, "section"), courseCode: f(form, "course"), date: f(form, "date"), start: f(form, "start"), end: f(form, "end"), room: f(form, "room") }));
}
export async function createEvent(form: FormData) {
  await run((c) => teacher.createEvent(c, { title: f(form, "title"), start: f(form, "start"), end: f(form, "end"), category: f(form, "category") }));
}
export async function setEventCancelled(id: string, cancelled: boolean) { await run((c) => teacher.setEventCancelled(c, id, cancelled)); }
export async function postDeadline(form: FormData) {
  await run((c) => teacher.postDeadline(c, { title: f(form, "title"), courseCode: f(form, "course"), due: f(form, "due"), kind: f(form, "kind"), section: f(form, "section") }));
}
export async function setClassroomUrl(code: string, form: FormData) { await run((c) => teacher.setClassroomUrl(c, code, f(form, "url") || null)); }
