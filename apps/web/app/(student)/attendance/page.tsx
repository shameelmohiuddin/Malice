import { courseView, overall, pct, shortName } from "@classpilot/core";
import { ClassroomLink, pctText, SectionHead, StatusTag } from "@/components/ui";
import { loadStudentData } from "@/lib/data";

export default async function Attendance() {
  const d = await loadStudentData();
  const min = Number(d.profile.min_attendance ?? 0.75);
  const o = overall(d.stats);
  const views = [...d.stats].sort((a, b) => a.name.localeCompare(b.name)).map((s) => courseView(s, { min, deadlineToday: false }));
  return (
    <div className="space-y-12">
      <section aria-labelledby="at-h" className="grid gap-6 lg:grid-cols-[1fr_auto] items-end">
        <div>
          <p className="label mb-3">From the ERP · minimum {Math.round(min * 100)}%</p>
          <h1 id="at-h" className="display text-[38px] md:text-[56px]">Attendance</h1>
          <p className="mt-2 text-ink-2 text-[17px] max-w-2xl">Each subject against the minimum, and what one missed class would change.</p>
        </div>
        <div className="folio px-6 py-4 text-right">
          <p className="label">Overall</p>
          <p className="num text-[40px] font-bold leading-none mt-1">{pct(o.present, o.held).toFixed(1)}<span className="text-accent text-[20px]">%</span></p>
          <p className="mono text-[11px] text-muted mt-1">{o.present}/{o.held} classes</p>
        </div>
      </section>

      <section aria-labelledby="reg-h">
        <SectionHead index="01" id="reg-h" title="By subject" meta={`${views.length} subjects`} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {views.map((v) => (
            <article key={v.code} className="folio p-5 flex flex-col gap-4">
              <div className="index-band"><span className="mono text-[11px] text-muted">{v.code}</span><StatusTag percent={v.percent} min={min} /></div>
              <div>
                <h3 className="display text-[34px]">{shortName(v.name)}</h3>
                <p className="text-ink-2">{v.name}</p>
              </div>
              <div className="plate p-4 flex items-end justify-between gap-4">
                <div><p className="num text-[36px] font-bold leading-none">{v.percent.toFixed(1)}<span className="text-[18px] text-accent">%</span></p><p className="num text-[13px] text-ink-2 mt-1.5">{v.present} of {v.held} attended</p></div>
                <p className={`text-right text-[17px] font-semibold leading-tight ${v.mustAttend > 0 ? "text-bad" : v.canSkip === 0 ? "text-warn" : "text-ok"}`}>
                  {v.mustAttend > 0 ? `Attend the next ${v.mustAttend}` : v.canSkip === 0 ? "Don't skip the next one" : `Can skip ${v.canSkip} more`}
                </p>
              </div>
              <dl className="mono text-[12px] space-y-2">
                <div className="flex justify-between gap-3"><dt className="text-muted">One more absence</dt><dd>{pctText(v.skipNext.before)} → <span className={v.skipNext.after < min * 100 ? "text-bad font-bold" : ""}>{pctText(v.skipNext.after)}</span></dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted">Classes left this semester</dt><dd>{v.semester.remaining}</dd></div>
              </dl>
              {d.classroom[v.code] && <div className="mt-auto pt-3 border-t border-line flex justify-end"><ClassroomLink url={d.classroom[v.code]} /></div>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
