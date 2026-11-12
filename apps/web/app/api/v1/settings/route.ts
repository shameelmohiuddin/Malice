import { api, body, okJson } from "@/lib/api";
import { validateMin } from "@/lib/validate";
/** PATCH { minAttendance: 50..95 } */
export const PATCH = api(async ({ supabase, user }, req) => {
  const min = validateMin(await body(req));
  const { error } = await supabase.from("profiles").update({ min_attendance: min }).eq("id", user.id);
  if (error) throw new Error(error.message);
  return okJson({ minAttendance: Math.round(min * 100) });
});
