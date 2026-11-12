import { nowMinutesIST, planStudy, prettyDate, shortName } from "@classpilot/core";
import { Empty, SectionHead } from "@/components/ui";
import { loadStudentData } from "@/lib/data";
import { addDeadline, deleteDeadline } from "./actions";

const HOURS = { exam: 4, quiz: 2, assignment: 2 } as const;

export default async function Planner() {
  const d = await loadStudentData();
  const upcoming = d.deadlines.filter((x) => x.due >= d.today);
  const { blocks, unplaced } = planStudy(d.timetable, upcoming, d.today, 14, nowMinutesIST());
  const name = (c: string | null) => d.stats.find((s) => s.code === c)?.name;
  const days = [...new Set(blocks.map((b) => b.date))];
  return (
    <div className="space-y-12">
      <section aria-labelledby="pl-h">
        <p className="label mb-3">Deadlines → study time</p>
        <h1 id="pl-h" className="display text-[38px] md:text-[56px]">Study planner</h1>
        <p className="mt-2 text-ink-2 text-[17px] max-w-2xl">Study time goes into free periods before each deadline, never over classes, breaks or lunch, and at most three hours a day. Earliest deadline first.</p>
      </section>

      <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
        <div className="space-y-8">
          <section aria-labelledby="add-h">
            <SectionHead index="01" id="add-h" title="Add a deadline" />
            <form action={addDeadline} className="folio p-5 space-y-4">
              <div className="field"><label htmlFor="dl-title" className="label">Title</label><input id="dl-title" name="title" required maxLength={120} placeholder="DBMS quiz 2" className="input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label htmlFor="dl-course" className="label">Subject</label>
                  <select id="dl-course" name="course" className="input"><option value="">None</option>{d.courses.map((c) => <option key={c.code} value={c.code}>{shortName(c.name)}</option>)}</select></div>
                <div className="field"><label htmlFor="dl-kind" className="label">Type</label>
                  <select id="dl-kind" name="kind" className="input"><option value="quiz">Quiz · 2 h</option><option value="assignment">Assignment · 2 h</option><option value="exam">Exam · 4 h</option></select></div>
              </div>
              <div className="field"><label htmlFor="dl-due" className="label">Due</label><input id="dl-due" name="due" type="date" required min={d.today} className="input" /></div>
              <button className="btn w-full">Add deadline</button>
            </form>
          </section>

          <section aria-labelledby="dl-h">
            <SectionHead index="02" id="dl-h" title="Deadlines" meta={`${upcoming.length} upcoming`} />
            {upcoming.length === 0 ? <Empty>No upcoming deadlines.</Empty> : (
              <ul className="folio divide-y divide-line">
                {upcoming.map((x) => (
                  <li key={x.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] truncate">{x.title}</span>
                      <span className="mono text-[11px] text-muted">{prettyDate(x.due)} · {x.kind} · {HOURS[x.kind]} h{name(x.courseCode) ? ` · ${shortName(name(x.courseCode)!)}` : ""}</span>
                    </span>
                    {x.scope === "personal"
                      ? <form action={deleteDeadline.bind(null, x.id)}><button className="link min-h-11 px-1">Remove</button></form>
                      : <span className="tag">From teacher</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="plan-h">
          <SectionHead index="03" id="plan-h" title="Your plan" meta="Next 14 days" />
          {unplaced.map((u) => (
            <p key={u.deadlineId} className="mb-3 px-4 py-3 border border-bad text-bad text-[15px]">
              Not enough free time for “{upcoming.find((x) => x.id === u.deadlineId)?.title}”: {u.hoursShort} h short.
            </p>
          ))}
          {days.length === 0 ? <div className="plate p-6"><Empty>Add a deadline to generate a plan.</Empty></div> : (
            <ol className="space-y-3">
              {days.map((day) => (
                <li key={day} className="folio">
                  <div className="index-band px-4 pt-3"><span className="headline text-[18px]">{day === d.today ? "Today" : prettyDate(day)}</span><span className="label">{blocks.filter((b) => b.date === day).reduce((a, b) => a + (+b.end.slice(0, 2) * 60 + +b.end.slice(3) - (+b.start.slice(0, 2) * 60 + +b.start.slice(3))), 0)} min</span></div>
                  <ul className="px-4 py-2 divide-y divide-line">
                    {blocks.filter((b) => b.date === day).map((b) => (
                      <li key={b.start} className="py-2.5 flex gap-4"><span className="mono text-[12px] w-[104px] shrink-0 pt-0.5">{b.start}–{b.end}</span><span className="text-[16px]">{b.title}</span></li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
