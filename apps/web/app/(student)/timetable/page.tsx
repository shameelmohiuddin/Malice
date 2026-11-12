import Link from "next/link";
import { addDays, classAdvice, parseHHMM, prettyDate, weekday } from "@bunk/core";
import { Chip, ClassroomLink } from "@/components/ui";
import { loadStudentData } from "@/lib/data";

export default async function Timetable({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const d = await loadStudentData();
  const { week } = await searchParams;
  const base = week ?? d.today;
  const monday = addDays(base, -((weekday(base) + 6) % 7));
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const min = Number(d.profile.min_attendance ?? 0.75);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timetable</h1>
        <div className="flex gap-2 text-sm">
          <Link className="btn btn-ghost" href={`/timetable?week=${addDays(monday, -7)}`}>← Prev</Link>
          <Link className="btn btn-ghost" href="/timetable">This week</Link>
          <Link className="btn btn-ghost" href={`/timetable?week=${addDays(monday, 7)}`}>Next →</Link>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {days.map((day) => {
          const slots = d.timetable.filter((t) => t.date === day).sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
          const ev = d.events.filter((e) => e.start <= day && e.end >= day);
          return (
            <div key={day} className={`card p-3 space-y-2 ${day === d.today ? "ring-2 ring-accent" : ""}`}>
              <p className="font-semibold text-sm">{prettyDate(day)}</p>
              {ev.map((e) => <p key={e.id} className={`text-xs px-2 py-1 rounded-md ${e.isHoliday ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-accent/10 text-accent"} ${e.cancelled ? "line-through" : ""}`}>{e.title}</p>)}
              {slots.length === 0 && !ev.length && <p className="text-xs text-muted">No classes</p>}
              {slots.map((t) => {
                if (!t.courseCode) return <p key={t.start} className="text-[11px] text-muted border-y border-dashed border-line py-0.5 text-center">{t.kind.toLowerCase()} · {t.start}</p>;
                const s = d.stats.find((x) => x.code === t.courseCode);
                const past = day < d.today;
                return (
                  <div key={t.start + t.courseCode} className={`rounded-lg border border-line p-2 space-y-1 ${t.cancelled ? "opacity-60" : ""}`}>
                    <p className="text-[11px] text-muted tabular-nums">{t.start}–{t.end}{t.room ? ` · ${t.room}` : ""}</p>
                    <p className={`text-sm font-medium leading-tight ${t.cancelled ? "line-through" : ""}`}>{s?.name ?? t.courseCode}</p>
                    <div className="flex flex-wrap gap-1 items-center">
                      {t.cancelled && <span className="text-[11px] font-semibold text-rose-600">Cancelled</span>}
                      {t.extra && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">Extra</span>}
                      {!t.cancelled && !past && s && <Chip advice={classAdvice(s, d.deadlines.some((x) => x.due === day && x.courseCode === s.code), min)} />}
                    </div>
                    <ClassroomLink url={d.classroom[t.courseCode]} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
