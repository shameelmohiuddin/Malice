import { nowMinutesIST, planStudy, prettyDate } from "@classpilot/core";
import { loadStudentData } from "@/lib/data";
import { addDeadline, deleteDeadline } from "./actions";

export default async function Planner() {
  const d = await loadStudentData();
  const upcoming = d.deadlines.filter((x) => x.due >= d.today);
  const { blocks, unplaced } = planStudy(d.timetable, upcoming, d.today, 14, nowMinutesIST());
  const name = (c: string | null) => d.stats.find((s) => s.code === c)?.name;
  const days = [...new Set(blocks.map((b) => b.date))];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Study planner</h1>
        <p className="text-sm text-muted">Add a deadline. ClassPilot fits study blocks into your free periods before it, with no clashes with classes, breaks or lunch, and at most 3 hours a day.</p>
        <form action={addDeadline} className="card p-4 space-y-3">
          <input name="title" required placeholder="e.g. DBMS quiz 2" className="input" />
          <div className="grid grid-cols-2 gap-2">
            <select name="course" className="input"><option value="">No subject</option>{d.courses.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
            <select name="kind" className="input"><option value="quiz">Quiz (2h)</option><option value="assignment">Assignment (2h)</option><option value="exam">Exam (4h)</option></select>
          </div>
          <input name="due" type="date" required min={d.today} className="input" />
          <button className="btn">Add deadline</button>
        </form>
        <ul className="card divide-y divide-line">
          {upcoming.length === 0 && <li className="p-4 text-sm text-muted">No upcoming deadlines.</li>}
          {upcoming.map((x) => (
            <li key={x.id} className="p-3 flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{x.title}</p>
                <p className="text-xs text-muted">{prettyDate(x.due)} · {x.kind}{name(x.courseCode) ? ` · ${name(x.courseCode)}` : ""}{x.scope === "class" ? " · from teacher" : ""}</p>
              </div>
              {x.scope === "personal" && <form action={deleteDeadline.bind(null, x.id)}><button className="text-xs text-muted hover:text-rose-600">Remove</button></form>}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <p className="label">Your plan</p>
        {unplaced.map((u) => (
          <p key={u.deadlineId} className="text-sm rounded-lg px-3 py-2 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Not enough free time for “{upcoming.find((x) => x.id === u.deadlineId)?.title}”: {u.hoursShort}h short.
          </p>
        ))}
        {days.length === 0 && <div className="card p-6 text-sm text-muted">Add a deadline to generate your plan.</div>}
        {days.map((day) => (
          <div key={day} className="card p-4">
            <p className="font-semibold text-sm mb-2">{prettyDate(day)}</p>
            <ul className="space-y-1.5">
              {blocks.filter((b) => b.date === day).map((b) => (
                <li key={b.start} className="flex gap-3 text-sm">
                  <span className="tabular-nums text-muted w-28 shrink-0">{b.start}–{b.end}</span>
                  <span className="font-medium">Study for {b.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
