import Link from "next/link";
import { classAdvice, overall, pct, parseHHMM, prettyDate } from "@bunk/core";
import { AttendanceCard } from "@/components/AttendanceCard";
import { Chip, ClassroomLink, fmt } from "@/components/ui";
import { loadStudentData } from "@/lib/data";

export default async function Dashboard() {
  const d = await loadStudentData();
  const min = Number(d.profile.min_attendance ?? 0.75);
  if (!d.stats.length)
    return (
      <div className="card p-8 text-center space-y-3">
        <h1 className="text-xl font-bold">No attendance yet</h1>
        <p className="text-muted">Connect your MITE ERP account to pull in your attendance and timetable.</p>
        <Link href="/settings" className="btn">Connect ERP</Link>
      </div>
    );
  const o = overall(d.stats);
  const dueToday = (code: string) => d.deadlines.some((x) => x.due === d.today && x.courseCode === code);
  const today = d.timetable.filter((t) => t.date === d.today && t.courseCode).sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
  const critical = d.stats.filter((s) => pct(s.present, s.held) < min * 100 + 5).length;
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Overall attendance</p>
          <p className="text-5xl font-extrabold tabular-nums">{fmt(pct(o.present, o.held))}</p>
          <p className="text-sm text-muted">{o.present}/{o.held} classes · {critical ? `${critical} subject${critical > 1 ? "s" : ""} near the limit` : "all subjects comfortable"}</p>
        </div>
        <p className="text-xs text-muted">{d.lastSync ? `ERP synced ${new Date(d.lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}` : "Demo data from ERP snapshot"}</p>
      </section>

      <section className="card p-4">
        <p className="label mb-3">Today · {prettyDate(d.today)}</p>
        {today.length === 0 ? <p className="text-muted text-sm">No classes today.</p> : (
          <ul className="divide-y divide-line">
            {today.map((t) => {
              const s = d.stats.find((x) => x.code === t.courseCode);
              return (
                <li key={t.start + t.courseCode} className="py-2 flex items-center gap-3 text-sm">
                  <span className="tabular-nums text-muted w-24 shrink-0">{t.start}–{t.end}</span>
                  <span className={`flex-1 min-w-0 truncate ${t.cancelled ? "line-through text-muted" : "font-medium"}`}>{s?.name ?? t.courseCode}</span>
                  {t.extra && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent/15 text-accent">Extra</span>}
                  {t.cancelled ? <span className="text-[11px] font-semibold text-muted">Cancelled</span> : s && <Chip advice={classAdvice(s, dueToday(s.code), min)} />}
                  <span className="hidden sm:inline"><ClassroomLink url={d.classroom[t.courseCode!]} /></span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...d.stats].sort((a, b) => pct(a.present, a.held) - pct(b.present, b.held)).map((s) => (
          <AttendanceCard key={s.code} s={s} min={min} deadlineToday={dueToday(s.code)} classroom={d.classroom[s.code]} />
        ))}
      </section>
    </div>
  );
}
