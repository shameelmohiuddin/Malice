import Link from "next/link";
import { addDays, prettyDate, shortName, weekday } from "@classpilot/core";
import { Empty, SectionHead } from "@/components/ui";
import { loadStudentData } from "@/lib/data";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type Item = { id: string; start: string; end: string; title: string; kind: "holiday" | "event" | "deadline"; cancelled: boolean; sub: string };
const COLOR = { holiday: "bg-ok", event: "bg-accent-fill", deadline: "bg-bad" } as const;

export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const d = await loadStudentData();
  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : d.today.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const first = `${month}-01`;
  const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lead = (weekday(first) + 6) % 7;
  const prev = mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  const name = (c: string | null) => d.stats.find((s) => s.code === c)?.name ?? "";

  const items: Item[] = [
    ...d.events.map((e) => ({ id: e.id, start: e.start, end: e.end, title: e.title, kind: e.isHoliday ? "holiday" as const : "event" as const, cancelled: e.cancelled, sub: e.category.toLowerCase() })),
    ...d.deadlines.map((x) => ({ id: x.id, start: x.due, end: x.due, title: x.title, kind: "deadline" as const, cancelled: false, sub: `${x.kind}${x.courseCode ? ` · ${shortName(name(x.courseCode))}` : ""}${x.scope === "personal" ? " · personal" : ""}` })),
  ].sort((a, b) => (a.start < b.start ? -1 : 1));
  const on = (day: string) => items.filter((i) => i.start <= day && i.end >= day);
  const inMonth = items.filter((i) => i.start.slice(0, 7) <= month && i.end.slice(0, 7) >= month);
  const range = (i: Item) => (i.end === i.start ? prettyDate(i.start) : `${prettyDate(i.start)} – ${prettyDate(i.end)}`);

  return (
    <div className="space-y-12">
      <section aria-labelledby="cal-h" className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label mb-3">Academic calendar · MITE and your teachers</p>
          <h1 id="cal-h" className="display text-[38px] md:text-[56px]">{MONTHS[mo - 1]} <span className="text-ink-2 font-semibold">{y}</span></h1>
        </div>
        <nav aria-label="Month" className="flex gap-2 w-full sm:w-auto [&>a]:flex-1 sm:[&>a]:flex-none">
          <Link className="btn btn-line" href={`/calendar?m=${prev}`}>← {MONTHS[(mo + 10) % 12].slice(0, 3)}</Link>
          <Link className="btn btn-line" href="/calendar">This month</Link>
          <Link className="btn btn-line" href={`/calendar?m=${next}`}>{MONTHS[mo % 12].slice(0, 3)} →</Link>
        </nav>
      </section>

      <section aria-label="Month grid" className="hidden md:block folio">
        <div className="grid grid-cols-7 border-b border-line">{DOW.map((w) => <div key={w} className="label px-3 py-2.5">{w}</div>)}</div>
        <div className="grid grid-cols-7">
          {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} className="min-h-[112px] border-b border-r border-line bg-panel/50" />)}
          {Array.from({ length: daysIn }, (_, i) => {
            const day = addDays(first, i);
            const list = on(day);
            const today = day === d.today;
            return (
              <div key={day} className={`min-h-[112px] p-2 border-b border-r border-line ${today ? "bg-panel" : ""}`}>
                <span className={`num text-[14px] font-bold inline-grid place-items-center w-7 h-7 ${today ? "bg-ink text-bg" : ""}`}>{i + 1}</span>
                <ul className="mt-1 space-y-1">
                  {list.slice(0, 3).map((it) =>
                    // A multi-day event is named on its first day, the 1st of the month and each Monday; other days show a quiet bar.
                    it.start !== day && day !== first && weekday(day) !== 1 ? (
                      <li key={it.id} title={it.title} className={`h-1.5 mt-2 ${COLOR[it.kind]} ${it.cancelled ? "opacity-40" : "opacity-70"}`}><span className="sr-only">{it.title} continues</span></li>
                    ) : (
                      <li key={it.id} className={`flex items-start gap-1.5 text-[12px] leading-tight ${it.cancelled ? "line-through text-muted" : ""}`}>
                        <span className={`dot mt-1 ${COLOR[it.kind]}`} aria-hidden /><span className="line-clamp-2">{it.title}</span>
                      </li>
                    ))}
                  {list.length > 3 && <li className="mono text-[11px] text-muted">+{list.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="list-h">
        <SectionHead index="01" id="list-h" title={`In ${MONTHS[mo - 1]}`} meta={<span className="flex gap-4">{(["holiday", "event", "deadline"] as const).map((k) => <span key={k} className="flex items-center gap-1.5"><span className={`dot ${COLOR[k]}`} />{k}</span>)}</span>} />
        {inMonth.length === 0 ? <Empty>Nothing on the calendar this month.</Empty> : (
          <ul className="folio divide-y divide-line">
            {inMonth.map((it) => (
              <li key={it.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${it.end < d.today ? "opacity-55" : ""}`}>
                <span className={`dot ${COLOR[it.kind]}`} aria-hidden />
                <span className="mono text-[12px] w-[150px] shrink-0">{range(it)}</span>
                <span className={`flex-1 min-w-[160px] text-[17px] ${it.cancelled ? "line-through text-muted" : ""}`}>{it.title}</span>
                <span className="mono text-[11px] text-muted">{it.sub}</span>
                {it.cancelled && <span className="tag tag-bad">Cancelled</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
