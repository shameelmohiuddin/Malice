import { attendanceStatus, isClassroomUrl, type AttendanceStatus } from "@classpilot/core";

export const pctText = (n: number) => `${n.toFixed(1)}%`;

const STATUS: Record<AttendanceStatus, { label: string; cls: string; dot: string }> = {
  clear: { label: "Clear", cls: "tag-ok", dot: "bg-ok" },
  close: { label: "Close to minimum", cls: "tag-warn", dot: "bg-warn" },
  below: { label: "Below minimum", cls: "tag-bad", dot: "bg-bad" },
};

export const StatusTag = ({ percent, min }: { percent: number; min: number }) => {
  const s = STATUS[attendanceStatus(percent, min)];
  return <span className={`tag ${s.cls}`}>{s.label}</span>;
};
export const StatusDot = ({ percent, min }: { percent: number; min: number }) => (
  <span className={`dot ${STATUS[attendanceStatus(percent, min)].dot}`} aria-hidden />
);

export const ClassroomLink = ({ url, label = "Open in Classroom" }: { url?: string | null; label?: string }) =>
  url && isClassroomUrl(url) ? <a href={url} target="_blank" rel="noreferrer" className="link">{label} ↗</a> : null;

/** Section header: mono index tag, display title, optional right-hand meta. */
export const SectionHead = ({ index, title, meta, id }: { index: string; title: string; meta?: React.ReactNode; id?: string }) => (
  <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-5">
    <div>
      <p className="flex items-center gap-2 mb-1.5"><span className="tag tag-ink">{index}</span></p>
      <h2 id={id} className="headline text-[26px] md:text-[30px]">{title}</h2>
    </div>
    {meta && <div className="label">{meta}</div>}
  </div>
);

export const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-ink-2 italic">{children}</p>
);

import { shortName } from "@classpilot/core";
type Catalog = Record<string, { name: string; instructor: string | null; counts: boolean }>;
/** How to show a course code: tracked subjects get a short code, non-credit sessions their full title. */
export const describe = (code: string | null, catalog: Catalog, stats: { code: string; name: string }[]) => {
  if (!code) return { short: "", full: "", instructor: null as string | null, activity: false };
  const tracked = stats.find((s) => s.code === code);
  const entry = catalog[code];
  const full = tracked?.name ?? entry?.name ?? code;
  const activity = !tracked && entry?.counts === false;
  return { short: activity ? full : shortName(full), full, instructor: entry?.instructor ?? null, activity };
};
