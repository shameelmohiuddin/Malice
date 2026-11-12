import { dashboardView, nowMinutesIST, MIN_ATTENDANCE } from "@classpilot/core";
import { api, okJson } from "@/lib/api";
import { loadStudentDataFor } from "@/lib/data";
export const GET = api(async (ctx) => {
  const d = await loadStudentDataFor(ctx);
  const view = dashboardView({ stats: d.stats, timetable: d.timetable, deadlines: d.deadlines, today: d.today, min: Number(d.profile.min_attendance ?? MIN_ATTENDANCE), nowMin: nowMinutesIST() });
  return okJson({ date: d.today, minAttendance: Math.round(Number(d.profile.min_attendance) * 100), lastSync: d.lastSync, ...view,
    courses: view.courses.map((c) => ({ ...c, classroomUrl: d.classroom[c.code] ?? null })) });
});
