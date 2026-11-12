import { nowMinutesIST, planStudy } from "@bunk/core";
import { api, okJson } from "@/lib/api";
import { loadStudentDataFor } from "@/lib/data";
export const GET = api(async (ctx) => {
  const d = await loadStudentDataFor(ctx);
  const upcoming = d.deadlines.filter((x) => x.due >= d.today);
  return okJson({ today: d.today, deadlines: upcoming, ...planStudy(d.timetable, upcoming, d.today, 14, nowMinutesIST()) });
});
