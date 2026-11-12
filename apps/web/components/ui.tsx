import { isClassroomUrl, type Advice } from "@classpilot/core";

export const ADVICE = {
  safe: { label: "ok to skip", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", bar: "bg-emerald-500" },
  risky: { label: "risky", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", bar: "bg-amber-500" },
  must: { label: "don't skip", cls: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300", bar: "bg-rose-500" },
} as const;

export const Chip = ({ advice }: { advice: Advice }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${ADVICE[advice].cls}`}>{ADVICE[advice].label}</span>
);

export const fmt = (n: number) => `${n.toFixed(1)}%`;

export const ClassroomLink = ({ url }: { url?: string }) =>
  url && isClassroomUrl(url) ? <a href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent hover:underline">Open in Classroom ↗</a> : null;
