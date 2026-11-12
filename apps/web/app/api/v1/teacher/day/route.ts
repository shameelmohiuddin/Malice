import { todayIST } from "@classpilot/core";
import { api, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
/** GET ?section=5CS3&date=YYYY-MM-DD */
export const GET = api(async (ctx, req) => {
  const q = new URL(req.url).searchParams;
  const section = q.get("section") ?? "5CS3", date = q.get("date") ?? todayIST();
  return okJson({ section, date, classes: await teacher.dayClasses(ctx, section, date) });
});
