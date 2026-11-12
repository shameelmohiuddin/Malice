import { api, okJson } from "@/lib/api";
import { loadStudentDataFor } from "@/lib/data";
export const GET = api(async (ctx) => {
  const d = await loadStudentDataFor(ctx);
  return okJson({ today: d.today, events: d.events, deadlines: d.deadlines });
});
