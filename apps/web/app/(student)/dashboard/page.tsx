import Link from "next/link";
import { addDays, nowMinutesIST, overall, parseHHMM, pct, planStudy, prettyDate, shortName } from "@classpilot/core";
import { AskBar } from "@/components/AskBar";
import { ClassroomLink, Empty, pctText, SectionHead, StatusDot, StatusTag } from "@/components/ui";
import { loadStudentData } from "@/lib/data";

const LONG_DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longDate = (d: string) => `${LONG_DAY[new Date(d + "T00:00:00Z").getUTCDay()]}, ${+d.slice(8)} ${LONG_MON[+d.slice(5, 7) - 1]}`;
const until = (mins: number) => (mins < 60 ? `in ${mins} min` : `in ${Math.floor(mins / 60)} h ${mins % 60 ? `${mins % 60} min` : ""}`.trim());

export default async function Today() {
  const d = await loadStudentData();
  const min = Number(d.profile.min_attendance ?? 0.75);
  const now = nowMinutesIST();
  const first = (d.profile.name ?? "").split(/\s+/)[0] || "there";
  const greeting = now < 12 * 60 ? "Good morning" : now < 17 * 60 ? "Good afternoon" : "Good evening";
  const name = (code: string | null) => d.stats.find((s) => s.code === code)?.name ?? code ?? "";

  if (!d.stats.length)
    return (
      <section className="folio p-8 md:p-12 max-w-2xl">
        <p className="label mb-3">Getting started</p>
        <h1 className="display text-[38px] md:text-[52px] mb-4">{greeting}, <em>{first}</em>.</h1>
        <p className="text-[18px] text-ink-2 mb-6">Connect your MITE ERP account to bring in your timetable, attendance and the academic calendar.</p>
        <Link href="/settings" className="btn">Connect the ERP</Link>
      </section>
    );

  const todaySlots = d.timetable.filter((t) => t.date === d.today).sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
  const upcoming = d.timetable.filter((t) => t.courseCode && !t.cancelled && (t.date > d.today || (t.date === d.today && parseHHMM(t.end) > now)))
    .sort((a, b) => (a.date === b.date ? parseHHMM(a.start) - parseHHMM(b.start) : a.date < b.date ? -1 : 1));
  const next = upcoming[0];
  const nextIsNow = next && next.date === d.today && parseHHMM(next.start) <= now;

  const horizon = addDays(d.today, 14);
  const coming = [
    ...d.deadlines.filter((x) => x.due >= d.today && x.due <= horizon).map((x) => ({ key: x.id, date: x.due, title: x.title, kind: x.kind, sub: x.courseCode ? shortName(name(x.courseCode)) : x.scope === "class" ? "Class" : "Personal", deadline: true, cancelled: false })),
    ...d.events.filter((e) => e.end >= d.today && e.start <= horizon).map((e) => ({ key: e.id, date: e.start < d.today ? d.today : e.start, title: e.title, kind: e.isHoliday ? "holiday" : "event", sub: e.category.toLowerCase(), deadline: false, cancelled: e.cancelled })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(0, 7);

  const plan = planStudy(d.timetable, d.deadlines.filter((x) => x.due >= d.today), d.today, 14, now);
  const planSoon = plan.blocks.filter((b) => b.date <= addDays(d.today, 1)).slice(0, 4);

  const o = overall(d.stats);
  const oPct = pct(o.present, o.held);
  const below = d.stats.filter((s) => pct(s.present, s.held) < min * 100);

  return (
    <div className="space-y-14 md:space-y-16">
      {/* Greeting + next class */}
      <section aria-labelledby="hello" className="grid gap-6 lg:grid-cols-[1fr_380px] items-end">
        <div>
          <p className="label mb-3">{longDate(d.today)} · Section {d.profile.section ?? "—"}</p>
          <h1 id="hello" className="display text-[40px] md:text-[64px]">{greeting}, <em className="font-semibold">{first}</em>.</h1>
          <p className="mt-3 text-[18px] text-ink-2 max-w-xl">
            {todaySlots.filter((t) => t.courseCode && !t.cancelled).length
              ? `${todaySlots.filter((t) => t.courseCode && !t.cancelled).length} ${todaySlots.filter((t) => t.courseCode && !t.cancelled).length === 1 ? "class" : "classes"} today${below.length ? `. ${below.map((s) => shortName(s.name)).join(", ")} ${below.length > 1 ? "are" : "is"} below the ${Math.round(min * 100)}% minimum.` : "."}`
              : "No classes today."}
          </p>
        </div>
        <div className="folio p-5">
          <div className="index-band"><span className="label text-accent">{nextIsNow ? "Now" : "Next class"}</span>{next && <span className="label">{next.date === d.today ? (nextIsNow ? `until ${next.end}` : until(parseHHMM(next.start) - now)) : prettyDate(next.date)}</span>}</div>
          {next ? (
            <div className="pt-3">
              <p className="headline text-[26px]">{shortName(name(next.courseCode))} <span className="text-ink-2 font-medium">at {next.start}</span></p>
              <p className="text-ink-2">{name(next.courseCode)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {next.room && <span className="tag">{next.room}</span>}
                <span className="tag">{next.kind === "EXTRA" ? "Extra class" : next.kind.toLowerCase()}</span>
                <span className="ml-auto"><ClassroomLink url={d.classroom[next.courseCode!]} /></span>
              </div>
            </div>
          ) : <p className="pt-3 text-ink-2">No upcoming classes in the timetable.</p>}
        </div>
      </section>

      {/* Today's schedule */}
      <section aria-labelledby="today-h">
        <SectionHead index="01" id="today-h" title="Today's schedule" meta={<Link href="/timetable" className="link">Full timetable</Link>} />
        {todaySlots.length === 0 ? <Empty>Nothing scheduled today.</Empty> : (
          <ol className="flex gap-2 overflow-x-auto pb-2 snap-x">
            {todaySlots.map((t) => {
              const done = parseHHMM(t.end) <= now;
              const live = !done && parseHHMM(t.start) <= now;
              if (!t.courseCode)
                return (
                  <li key={t.start} className="snap-start shrink-0 w-[120px] plate p-3 flex flex-col justify-between min-h-[168px]">
                    <span className="mono text-[11px] text-muted">{t.start}–{t.end}</span>
                    <span className="headline italic text-[18px] text-ink-2">{t.kind === "LUNCH" ? "Lunch" : "Break"}</span>
                    <span className="label">{parseHHMM(t.end) - parseHHMM(t.start)} min</span>
                  </li>
                );
              return (
                <li key={t.start + t.courseCode} className={`snap-start shrink-0 grow basis-[200px] max-w-[300px] p-3 flex flex-col gap-2 min-h-[168px] ${live ? "bg-card border-2" : "folio"} ${done || t.cancelled ? "opacity-60" : ""}`} style={live ? { borderColor: "var(--accent-fill)" } : undefined}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono text-[12px] font-bold">{t.start}–{t.end}</span>
                    {t.cancelled ? <span className="tag tag-bad">Cancelled</span> : t.extra ? <span className="tag tag-ink">Extra</span> : live ? <span className="tag tag-warn">Now</span> : done ? <span className="tag">Done</span> : null}
                  </div>
                  <p className={`headline text-[22px] ${t.cancelled ? "line-through" : ""}`}>{shortName(name(t.courseCode))}</p>
                  <p className="text-[14px] text-ink-2 leading-snug">{name(t.courseCode)}</p>
                  {t.room && <p className="mt-auto mono text-[11px] text-muted">{t.room}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Coming up + study plan */}
      <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div aria-labelledby="coming-h">
          <SectionHead index="02" id="coming-h" title="Coming up" meta="Next two weeks" />
          {coming.length === 0 ? <Empty>No deadlines or events in the next two weeks.</Empty> : (
            <ul className="folio divide-y divide-line">
              {coming.map((c) => (
                <li key={c.key} className="flex items-center gap-4 px-4 py-3.5">
                  <span className="w-14 shrink-0 text-center">
                    <span className="block num text-[24px] leading-none font-bold">{+c.date.slice(8)}</span>
                    <span className="label" style={{ fontSize: 9 }}>{prettyDate(c.date).split(" ")[0]} {prettyDate(c.date).split(" ")[2]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[17px] leading-snug ${c.cancelled ? "line-through text-muted" : ""}`}>{c.title}</span>
                    <span className="mono text-[11px] text-muted">{c.sub}</span>
                  </span>
                  {c.cancelled ? <span className="tag tag-bad">Cancelled</span>
                    : c.deadline ? <span className="tag tag-ink">{c.kind}</span>
                    : c.kind === "holiday" ? <span className="tag tag-ok">Holiday</span> : <span className="tag">Event</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div aria-labelledby="plan-h">
          <SectionHead index="03" id="plan-h" title="Study plan" meta={<Link href="/planner" className="link">Planner</Link>} />
          <div className="plate p-5">
            {planSoon.length ? (
              <ul className="space-y-3">
                {planSoon.map((b) => (
                  <li key={b.date + b.start} className="flex gap-3">
                    <span className="mono text-[12px] w-[104px] shrink-0 pt-0.5">{b.date === d.today ? "Today" : "Tomorrow"} {b.start}</span>
                    <span className="text-[16px]">{b.title}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>{d.deadlines.some((x) => x.due >= d.today) ? "No study blocks needed today or tomorrow." : "Add a deadline and ClassPilot fits study time around your classes."}</Empty>}
            {plan.unplaced.length > 0 && <p className="mt-4 text-[14px] text-bad">Not enough free time before {plan.unplaced.length} deadline{plan.unplaced.length > 1 ? "s" : ""}.</p>}
          </div>
        </div>
      </section>

      {/* Ask */}
      <section aria-label="Ask ClassPilot">
        <AskBar suggestions={["When is my next class?", "Events this week", `${shortName(d.stats[0].name)} attendance`]} />
      </section>

      {/* Attendance register (calm) */}
      <section aria-labelledby="att-h">
        <SectionHead index="04" id="att-h" title="Attendance" meta={<Link href="/attendance" className="link">Details by subject</Link>} />
        <div className="folio">
          <div className="flex flex-wrap items-end justify-between gap-4 p-5 border-b border-line">
            <div>
              <p className="label mb-1">Overall</p>
              <p className="num text-[44px] font-bold leading-none">{oPct.toFixed(1)}<span className="text-[22px] text-accent">%</span></p>
            </div>
            <p className="mono text-[12px] text-ink-2">{o.present} of {o.held} classes attended · minimum {Math.round(min * 100)}%</p>
          </div>
          <table className="w-full text-left">
            <caption className="sr-only">Attendance by subject</caption>
            <thead><tr className="border-b border-line"><th scope="col" className="label font-bold px-5 py-2.5">Subject</th><th scope="col" className="label font-bold px-3 py-2.5 text-right hidden sm:table-cell">Attended</th><th scope="col" className="label font-bold px-5 py-2.5 text-right">%</th></tr></thead>
            <tbody>
              {[...d.stats].sort((a, b) => a.name.localeCompare(b.name)).map((s) => {
                const p = pct(s.present, s.held);
                return (
                  <tr key={s.code} className="border-b border-line last:border-0">
                    <td className="px-5 py-3"><span className="flex items-center gap-3"><StatusDot percent={p} min={min} /><span><span className="mono text-[13px] font-bold">{shortName(s.name)}</span> <span className="text-ink-2 text-[15px] hidden md:inline">{s.name}</span></span></span></td>
                    <td className="px-3 py-3 text-right num text-[14px] text-ink-2 hidden sm:table-cell">{s.present}/{s.held}</td>
                    <td className="px-5 py-3 text-right"><span className="num text-[16px] font-bold">{pctText(p)}</span>{p < min * 100 + 5 && <span className="ml-2 hidden md:inline"><StatusTag percent={p} min={min} /></span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
