import { classAdvice, costOfMiss, mustAttend, pct, projection, safeToMiss, type CourseStats } from "@classpilot/core";
import { ADVICE, Chip, ClassroomLink, fmt } from "./ui";

export function AttendanceCard({ s, deadlineToday, classroom, min }: { s: CourseStats; deadlineToday: boolean; classroom?: string; min: number }) {
  const p = pct(s.present, s.held);
  const adv = classAdvice(s, deadlineToday, min);
  const skip = safeToMiss(s.present, s.held, min);
  const need = mustAttend(s.present, s.held, min);
  const c = costOfMiss(s.present, s.held);
  const pr = projection(s, min);
  return (
    <div className="card p-4 flex flex-col gap-3 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${ADVICE[adv].bar}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold leading-tight truncate" title={s.name}>{s.name}</p>
          <p className="text-xs text-muted">{s.code}</p>
        </div>
        <Chip advice={adv} />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-extrabold tabular-nums">{fmt(p)}</span>
        <span className="text-sm text-muted mb-1">{s.present}/{s.held} attended</span>
      </div>
      <div className="h-1.5 rounded-full bg-line overflow-hidden relative">
        <div className={`h-full ${ADVICE[adv].bar}`} style={{ width: `${Math.min(100, p)}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-ink/60" style={{ left: `${min * 100}%` }} />
      </div>
      <p className={`text-sm font-semibold ${skip > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
        {skip > 0 ? `Can skip ${skip} more` : need > 0 ? `Attend the next ${need} to reach ${min * 100}%` : "Can't skip any more"}
      </p>
      <dl className="text-xs text-muted space-y-1">
        <div className="flex justify-between"><dt>Skip next class</dt><dd className="tabular-nums text-ink">{fmt(c.before)} → {fmt(c.after)} (−{c.drop.toFixed(1)}%)</dd></div>
        <div className="flex justify-between"><dt>By semester end</dt><dd className="tabular-nums text-ink">can miss {pr.canMissRemaining} of {pr.remaining} left</dd></div>
      </dl>
      <ClassroomLink url={classroom} />
    </div>
  );
}
