import Link from "next/link";
import { addDays, isISODate, nowMinutesIST, parseHHMM, pct, prettyDate, shortName, weekday } from "@classpilot/core";
import { ClassroomLink, describe, pctText, SectionHead, StatusDot } from "@/components/ui";
import { loadStudentData } from "@/lib/data";

const STEP = 5; // minutes per grid column

export default async function Timetable({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const d = await loadStudentData();
  const { week } = await searchParams;
  const base = isISODate(week) ? week : d.today;
  const monday = addDays(base, -((weekday(base) + 6) % 7));
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const min = Number(d.profile.min_attendance ?? 0.75);
  const now = nowMinutesIST();
  const info = (c: string | null) => describe(c, d.catalog, d.stats);
  const name = (c: string | null) => info(c).full;

  const weekSlots = d.timetable.filter((t) => t.date >= days[0] && t.date <= days[5]);
  const start = Math.min(9 * 60, ...weekSlots.map((t) => parseHHMM(t.start)));
  const end = Math.max(16 * 60 + 30, ...weekSlots.map((t) => parseHHMM(t.end)));
  const cols = Math.ceil((end - start) / STEP);
  const col = (hhmm: string) => Math.round((parseHHMM(hhmm) - start) / STEP) + 1;
  const ticks = [...new Set(weekSlots.filter((t) => t.courseCode).map((t) => t.start))].sort();
  const classes = weekSlots.filter((t) => t.courseCode && !info(t.courseCode).activity && !t.cancelled).length;

  return (
    <div className="space-y-12">
      <section aria-labelledby="tt-h" className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label mb-3">Week of {prettyDate(monday)} · Section {d.profile.section ?? "—"}</p>
          <h1 id="tt-h" className="display text-[38px] md:text-[56px]">Timetable</h1>
          <p className="mt-2 text-ink-2 text-[17px]">{classes} classes this week · official MITE timetable, ERP sessions and teachers&apos; changes{d.advisor ? ` · Class advisor ${d.advisor}` : ""}</p>
        </div>
        <nav aria-label="Week" className="flex gap-2 w-full sm:w-auto [&>a]:flex-1 sm:[&>a]:flex-none">
          <Link className="btn btn-line" href={`/timetable?week=${addDays(monday, -7)}`} aria-label="Previous week">←<span className="hidden sm:inline"> Previous</span></Link>
          <Link className="btn btn-line" href="/timetable">This week</Link>
          <Link className="btn btn-line" href={`/timetable?week=${addDays(monday, 7)}`} aria-label="Next week"><span className="hidden sm:inline">Next </span>→</Link>
        </nav>
      </section>

      {/* Desktop: time grid */}
      <section aria-label="Week grid" className="hidden lg:block folio p-3 overflow-x-auto">
        <div className="grid min-w-[1100px]" style={{ gridTemplateColumns: `112px repeat(${cols}, minmax(0,1fr))` }}>
          <div className="label px-2 py-3 self-end">Day</div>
          {ticks.map((t) => <div key={t} className="mono text-[11px] text-muted py-3 border-l border-line pl-1.5" style={{ gridColumn: `${col(t) + 1} / span 6` }}>{t}</div>)}
        </div>
        {days.map((day) => {
          const slots = d.timetable.filter((t) => t.date === day).sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
          const ev = d.events.filter((e) => e.start <= day && e.end >= day);
          const isToday = day === d.today;
          return (
            <div key={day} className={`grid min-w-[1100px] border-t border-line ${isToday ? "bg-panel" : ""}`} style={{ gridTemplateColumns: `112px repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: "minmax(132px, auto)" }}>
              <div className="px-2 py-3 flex flex-col">
                <span className="headline text-[22px]">{prettyDate(day).split(" ")[0]}</span>
                <span className="mono text-[11px] text-muted">{prettyDate(day).slice(4)}</span>
                {isToday && <span className="tag tag-ink mt-2 self-start">Today</span>}
                {ev.map((e) => <span key={e.id} className={`mt-2 text-[12px] leading-tight ${e.isHoliday ? "text-ok" : "text-accent"} ${e.cancelled ? "line-through" : ""}`}>{e.title}</span>)}
              </div>
              {slots.length === 0 && <div className="self-center italic text-ink-2 px-3" style={{ gridColumn: `2 / -1` }}>{ev.some((e) => e.isHoliday) ? "Holiday" : ev.length ? "No regular classes" : "No classes"}</div>}
              {slots.map((t) => {
                const span = `${col(t.start) + 1} / ${col(t.end) + 1}`;
                if (!t.courseCode)
                  return <div key={t.start} className="m-1 plate grid place-items-center" style={{ gridColumn: span }}><span className="label [writing-mode:vertical-rl] rotate-180" style={{ fontSize: 9 }}>{t.kind === "LUNCH" ? "Lunch" : "Break"}</span></div>;
                const s = d.stats.find((x) => x.code === t.courseCode);
                const p = s ? pct(s.present, s.held) : null;
                const past = day < d.today || (isToday && parseHHMM(t.end) <= now);
                return (
                  <div key={t.start + t.courseCode} title={`${name(t.courseCode)}${info(t.courseCode).instructor ? ` · ${info(t.courseCode).instructor}` : ""}`} className={`m-1 p-2.5 flex flex-col gap-1 border ${info(t.courseCode).activity ? "border-dashed border-line bg-panel" : t.extra ? "border-accent-fill bg-card" : "border-line bg-card"} ${t.cancelled || past ? "opacity-55" : ""}`} style={{ gridColumn: span }}>
                    <div className="flex items-start justify-between gap-1">
                      <span className={`headline leading-tight ${info(t.courseCode).activity ? "italic text-[15px] text-ink-2" : "text-[17px]"} ${t.cancelled ? "line-through" : ""}`}>{info(t.courseCode).short}</span>
                      {t.room && <span className="mono text-[10px] text-muted whitespace-nowrap">{t.room}</span>}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-1">
                      {t.cancelled ? <span className="tag tag-bad">Cancelled</span> : t.extra ? <span className="tag tag-ink">Extra</span>
                        : <span className="mono text-[10px] text-muted">{t.start}–{t.end}{t.kind === "LAB" ? " · Lab" : t.kind === "TUTORIAL" ? " · Tutorial" : ""}</span>}
                      {p !== null && !t.cancelled && <StatusDot percent={p} min={min} />}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      {/* Phone and tablet: day list */}
      <section aria-label="Week by day" className="lg:hidden space-y-4">
        {days.map((day) => {
          const slots = d.timetable.filter((t) => t.date === day && t.courseCode).sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
          const ev = d.events.filter((e) => e.start <= day && e.end >= day);
          return (
            <div key={day} className={`folio ${day === d.today ? "border-2" : ""}`} style={day === d.today ? { borderColor: "var(--accent-fill)" } : undefined}>
              <div className="index-band px-4 pt-4">
                <span className="headline text-[20px]">{prettyDate(day)}</span>
                {day === d.today ? <span className="tag tag-ink">Today</span> : <span className="label">{slots.length} {slots.length === 1 ? "class" : "classes"}</span>}
              </div>
              {ev.map((e) => <p key={e.id} className={`px-4 pt-3 text-[14px] ${e.isHoliday ? "text-ok" : "text-accent"} ${e.cancelled ? "line-through" : ""}`}>{e.title}</p>)}
              {slots.length === 0 ? <p className="px-4 py-4 italic text-ink-2">No classes</p> : (
                <ul className="divide-y divide-line">
                  {slots.map((t) => (
                    <li key={t.start + t.courseCode} className={`px-4 py-3 flex items-center gap-3 ${t.cancelled ? "opacity-60" : ""}`}>
                      <span className="mono text-[12px] w-[92px] shrink-0">{t.start}–{t.end}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block ${info(t.courseCode).activity ? "italic text-ink-2" : "font-semibold"} ${t.cancelled ? "line-through" : ""}`}>{info(t.courseCode).short}</span>
                        <span className="block text-[13px] text-ink-2 truncate">{info(t.courseCode).activity ? "Non-credit session" : name(t.courseCode)}{t.kind === "LAB" ? " · Lab" : ""}{t.room ? ` · ${t.room}` : ""}</span>
                      </span>
                      {t.cancelled ? <span className="tag tag-bad">Cancelled</span> : t.extra ? <span className="tag tag-ink">Extra</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {/* Subjects */}
      <section aria-labelledby="subj-h">
        <SectionHead index="02" id="subj-h" title="Subjects" meta={`${d.stats.length} this semester`} />
        <div className="folio overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <caption className="sr-only">Subjects this semester</caption>
            <thead><tr className="border-b border-line">
              <th scope="col" className="label font-bold px-5 py-3">Code</th><th scope="col" className="label font-bold px-3 py-3">Short</th>
              <th scope="col" className="label font-bold px-3 py-3">Subject</th><th scope="col" className="label font-bold px-3 py-3">Instructor</th><th scope="col" className="label font-bold px-3 py-3 text-right">Attendance</th>
              <th scope="col" className="label font-bold px-5 py-3 text-right">Classroom</th>
            </tr></thead>
            <tbody>
              {[...d.stats].sort((a, b) => a.code.localeCompare(b.code)).map((s) => (
                <tr key={s.code} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 mono text-[13px] font-bold">{s.code}</td>
                  <td className="px-3 py-3 mono text-[13px] text-accent">{shortName(s.name)}</td>
                  <td className="px-3 py-3 text-[16px]">{s.name}</td>
                  <td className="px-3 py-3 text-[15px] text-ink-2">{d.catalog[s.code]?.instructor ?? "—"}</td>
                  <td className="px-3 py-3 text-right num">{pctText(pct(s.present, s.held))}</td>
                  <td className="px-5 py-3 text-right"><ClassroomLink url={d.classroom[s.code]} label="Open" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(() => {
          const extra = [...new Set(d.timetable.filter((t) => t.courseCode && describe(t.courseCode, d.catalog, d.stats).activity).map((t) => t.courseCode!))];
          return extra.length ? (
            <div className="mt-4 plate px-5 py-4">
              <p className="label mb-2">Also on your timetable · not counted in attendance</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-1.5 text-[15px]">
                {extra.map((c) => <li key={c}>{d.catalog[c]?.name ?? c}{d.catalog[c]?.instructor ? <span className="text-ink-2"> · {d.catalog[c].instructor}</span> : null}</li>)}
              </ul>
            </div>
          ) : null;
        })()}
      </section>
    </div>
  );
}
