import { api, body, okJson } from "@/lib/api";
import { validateDeadline } from "@/lib/validate";
import { toDeadline } from "@/lib/data";
export const GET = api(async ({ supabase }) => {
  const { data, error } = await supabase.from("deadlines").select("*").order("due");
  if (error) throw new Error(error.message);
  return okJson((data ?? []).map(toDeadline));
});
/** POST { title, due, kind, courseCode? } → personal deadline */
export const POST = api(async ({ supabase, user }, req) => {
  const v = validateDeadline(await body(req));
  const { data, error } = await supabase.from("deadlines").insert({ title: v.title, course_code: v.courseCode, due: v.due, kind: v.kind, scope: "personal", owner_id: user.id }).select().single();
  if (error) throw new Error(error.message);
  return okJson(toDeadline(data), 201);
});
