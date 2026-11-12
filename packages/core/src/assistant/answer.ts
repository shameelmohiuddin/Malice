import { classAdvice, costOfMiss, mustAttend, overall, pct, safeToMiss } from "../attendance";
import { addDays, parseHHMM, weekday } from "../dates";
import type { CalendarEvent, CourseStats, Deadline, TimetableSlot } from "../types";
import { classify, type Intent } from "./intents";

export type AssistantData = {
  stats: CourseStats[];
  timetable: TimetableSlot[]; // already merged with overrides
  events: CalendarEvent[];
  deadlines: Deadline[];
  classroom: Record<string, string>;
};
export type Reply = { text: string; navigate?: string; openUrl?: string; options?: string[] };

const P = (n: number) => `${n.toFixed(1)}%`;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const prettyDate = (d: string) => `${DAY[weekday(d)]} ${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "es"}`;

export const HELP = [
  "How many classes can I skip in DBMS?",
  "What if I skip FSD?",
  "Can I skip tomorrow?",
  "What's my attendance?",
  "When is my next class?",
  "Any events this week?",
  "Open calendar",
];

const canSkipLine = (s: CourseStats) => {
  const n = safeToMiss(s.present, s.held);
  if (n > 0) return `You can skip ${n} more ${s.name} ${n === 1 ? "class" : "classes"} and stay ≥75% (now ${P(pct(s.present, s.held))}).`;
  const need = mustAttend(s.present, s.held);
  return need > 0
    ? `Don't skip ${s.name}. You're at ${P(pct(s.present, s.held))} and need to attend the next ${plural(need, "class")} to get back to 75%.`
    : `You can't skip any more ${s.name} classes. One miss takes you to ${P(costOfMiss(s.present, s.held).after)}.`;
};

const ADVICE_WORD = { safe: "ok to skip", risky: "risky", must: "don't skip" } as const;

export const answer = (intent: Intent, data: AssistantData, today: string, nowMin = 0): Reply => {
  const stat = intent.subject ? data.stats.find((s) => s.code === intent.subject) : undefined;
  const nameOf = (code: string | null) => data.stats.find((s) => s.code === code)?.name ?? code ?? "Class";

  switch (intent.kind) {
    case "attendance": {
      if (stat) return { text: `${stat.name}: ${P(pct(stat.present, stat.held))} (${stat.present}/${stat.held}). ${canSkipLine(stat)}` };
      const o = overall(data.stats);
      const lines = [...data.stats].sort((a, b) => pct(a.present, a.held) - pct(b.present, b.held))
        .map((s) => `• ${s.name}: ${P(pct(s.present, s.held))}`);
      return { text: [`Overall: ${P(pct(o.present, o.held))} (${o.present}/${o.held}).`, ...lines].join("\n") };
    }
    case "can_skip": {
      if (stat) return { text: canSkipLine(stat) };
      return { text: data.stats.map((s) => `• ${s.name}: ${safeToMiss(s.present, s.held)} more`).join("\n") };
    }
    case "cost_of_skip": {
      if (!stat) return { text: "Which subject?", options: data.stats.map((s) => s.name) };
      const c = costOfMiss(stat.present, stat.held);
      return { text: `Skipping the next ${stat.name} class takes you from ${P(c.before)} → ${P(c.after)} (−${c.drop.toFixed(1)}%).` };
    }
    case "should_skip_day": {
      const date = intent.date ?? today;
      const slots = data.timetable
        .filter((t) => t.date === date && t.courseCode && !t.cancelled && (!intent.subject || t.courseCode === intent.subject))
        .sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
      if (!slots.length) return { text: `You have no${intent.subject ? ` ${nameOf(intent.subject)}` : ""} classes on ${prettyDate(date)}.` };
      const lines = slots.map((t) => {
        const s = data.stats.find((x) => x.code === t.courseCode);
        if (!s) return `• ${t.start} ${nameOf(t.courseCode)}`;
        const dl = data.deadlines.some((d) => d.due === date && d.courseCode === s.code);
        const adv = classAdvice(s, dl);
        const why = dl ? "deadline that day" : `skipping drops you to ${P(costOfMiss(s.present, s.held).after)}`;
        return `• ${t.start} ${s.name}: ${ADVICE_WORD[adv]} (${why})`;
      });
      return { text: [`${prettyDate(date)}:`, ...lines].join("\n") };
    }
    case "next_class": {
      const next = data.timetable
        .filter((t) => t.courseCode && !t.cancelled && (t.date > today || (t.date === today && parseHHMM(t.start) >= nowMin)))
        .filter((t) => !intent.subject || t.courseCode === intent.subject)
        .sort((a, b) => (a.date === b.date ? parseHHMM(a.start) - parseHHMM(b.start) : a.date < b.date ? -1 : 1))[0];
      if (!next) return { text: "No upcoming classes in your timetable." };
      return { text: `Next: ${nameOf(next.courseCode)} on ${prettyDate(next.date)} at ${next.start}${next.room ? ` in ${next.room}` : ""}.` };
    }
    case "events": {
      const from = intent.date ?? today;
      const to = intent.date ?? addDays(today, 14);
      const ev = data.events.filter((e) => e.end >= from && e.start <= to).sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, 6);
      if (!ev.length) return { text: intent.date ? `Nothing on ${prettyDate(intent.date)}.` : "No events in the next two weeks." };
      return { text: ev.map((e) => `• ${prettyDate(e.start)}: ${e.title}${e.cancelled ? " (cancelled)" : ""}${e.isHoliday ? " (holiday)" : ""}`).join("\n"), navigate: undefined };
    }
    case "open_section":
      return { text: `Opening ${intent.section}.`, navigate: `/${intent.section}` };
    case "open_classroom": {
      if (!stat) return { text: "Classroom for which subject?", options: data.stats.map((s) => s.name) };
      const url = data.classroom[stat.code];
      return url ? { text: `Opening ${stat.name} on Google Classroom.`, openUrl: url } : { text: `No Classroom link set for ${stat.name} yet.` };
    }
    default:
      return { text: "I can help with things like:", options: HELP };
  }
};

/** The single entry point the UIs call. */
export const ask = (text: string, data: AssistantData, today: string, nowMin = 0): Reply => {
  const r = classify(text, data.stats, today);
  if ("clarify" in r) return { text: r.clarify, options: r.options };
  return answer(r, data, today, nowMin);
};
