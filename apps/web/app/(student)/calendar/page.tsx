import { prettyDate } from "@bunk/core";
import { loadStudentData } from "@/lib/data";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function Calendar() {
  const d = await loadStudentData();
  const name = (c: string | null) => d.stats.find((s) => s.code === c)?.name ?? "";
  type Item = { id: string; date: string; end?: string; title: string; kind: "holiday" | "event" | "deadline"; cancelled?: boolean; sub?: string };
  const items: Item[] = [
    ...d.events.map((e) => ({ id: e.id, date: e.start, end: e.end, title: e.title, kind: e.isHoliday ? "holiday" as const : "event" as const, cancelled: e.cancelled, sub: e.category })),
    ...d.deadlines.map((x) => ({ id: x.id, date: x.due, title: x.title, kind: "deadline" as const, sub: `${x.kind}${x.courseCode ? ` · ${name(x.courseCode)}` : ""}${x.scope === "personal" ? " · personal" : ""}` })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const months = [...new Set(items.map((i) => i.date.slice(0, 7)))];
  const style = { holiday: "bg-emerald-500", event: "bg-accent", deadline: "bg-rose-500" };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex gap-3 text-xs text-muted">
          {Object.entries(style).map(([k, c]) => <span key={k} className="flex items-center gap-1"><i className={`w-2 h-2 rounded-full ${c}`} />{k}</span>)}
        </div>
      </div>
      {months.map((m) => (
        <section key={m}>
          <p className="label mb-2">{MONTHS[+m.slice(5) - 1]} {m.slice(0, 4)}</p>
          <ul className="card divide-y divide-line">
            {items.filter((i) => i.date.startsWith(m)).map((i) => (
              <li key={i.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i.date < d.today ? "opacity-50" : ""}`}>
                <i className={`w-2 h-2 rounded-full shrink-0 ${style[i.kind]}`} />
                <span className="w-28 shrink-0 tabular-nums text-muted">{prettyDate(i.date)}{i.end && i.end !== i.date ? ` – ${+i.end.slice(8)}` : ""}</span>
                <span className={`flex-1 font-medium ${i.cancelled ? "line-through text-muted" : ""}`}>{i.title}</span>
                {i.cancelled && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Cancelled</span>}
                <span className="text-xs text-muted hidden sm:inline lowercase">{i.sub}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
