import { addDays, classAdvice, isISODate, nowMinutesIST, parseHHMM, weekday, MIN_ATTENDANCE } from "@classpilot/core";
import { api, okJson } from "@/lib/api";
import { loadStudentDataFor } from "@/lib/data";
import { ValidationError } from "@/lib/validate";
/** GET /api/v1/timetable?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to this Mon–Sat; data covers today-14 … today+42). */
export const GET = api(async (ctx, req) => {
  const d = await loadStudentDataFor(ctx);
  const q = new URL(req.url).searchParams;
  const monday = addDays(d.today, -((weekday(d.today) + 6) % 7));
  const from = q.get("from") ?? monday, to = q.get("to") ?? addDays(monday, 5);
  if (!isISODate(from) || !isISODate(to) || to < from) throw new ValidationError("from/to must be YYYY-MM-DD with to >= from");
  const min = Number(d.profile.min_attendance ?? MIN_ATTENDANCE);
  const now = nowMinutesIST();
  const slots = d.timetable.filter((t) => t.date >= from && t.date <= to).map((t) => {
    const s = d.stats.find((x) => x.code === t.courseCode);
    const past = t.date < d.today || (t.date === d.today && parseHHMM(t.end) <= now);
    return { ...t, past, courseName: s?.name ?? null, classroomUrl: t.courseCode ? d.classroom[t.courseCode] ?? null : null,
      advice: s && !t.cancelled && !past ? classAdvice(s, d.deadlines.some((x) => x.due === t.date && x.courseCode === s.code), min) : null };
  });
  const events = d.events.filter((e) => e.end >= from && e.start <= to);
  return okJson({ from, to, today: d.today, slots, events });
});
