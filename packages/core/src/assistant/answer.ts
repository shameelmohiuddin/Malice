import { classAdvice, costOfMiss, mustAttend, overall, pct, safeToMiss } from "../attendance";
import { addDays, parseHHMM, weekday } from "../dates";
import type { CalendarEvent, CourseStats, Deadline, TimetableSlot } from "../types";
import { classify, type Intent } from "./intents";
import { normalize } from "./normalize";
import { acronyms } from "./subjects";

export type AssistantData = {
  stats: CourseStats[];
  timetable: TimetableSlot[]; // already merged with overrides
  events: CalendarEvent[];
  deadlines: Deadline[];
  classroom: Record<string, string>;
  min?: number; // student minimum, default 0.75
  names?: Record<string, string>; // course code → title, for sessions outside attendance (activities)
};
export type Reply = { text: string; navigate?: string; openUrl?: string; options?: string[] };

const P = (n: number) => `${n.toFixed(1)}%`;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const prettyDate = (d: string) => `${DAY[weekday(d)]} ${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]}`;

export const HELP = [
  "How many classes can I skip in DBMS?",
  "What if I skip FSD?",
  "Can I skip tomorrow?",
  "What's my attendance?",
  "When is my next class?",
  "Any events this week?",
  "Open calendar",
];

const isLab = (name: string) => /\b(lab|laboratory)\b/i.test(name);

/** The name to say back: the acronym if the user typed it ("DBMS"), otherwise the full name. */
const labelFor = (s: CourseStats, text: string) => {
  const tokens = normalize(text);
  const hit = acronyms(s.name).find((a) => tokens.includes(a));
  if (!hit) return s.name;
  // "cn lab" → the acronym without the lab letter, then "lab" ("CN lab").
  return isLab(s.name) && !hit.endsWith("l") ? `${hit.toUpperCase()} lab` : isLab(s.name) ? `${hit.slice(0, -1).toUpperCase()} lab` : hit.toUpperCase();
};

/** The lab course that pairs with a theory course (Computer Networks ↔ Computer Networks Laboratory). */
const labFor = (s: CourseStats, all: CourseStats[]) => {
  if (isLab(s.name)) return undefined;
  const a = acronyms(s.name)[0];
  return all.find((x) => x.code !== s.code && isLab(x.name) && acronyms(x.name).includes(a));
};

const canSkipLine = (s: CourseStats, label: string, all: CourseStats[], min: number) => {
  const n = safeToMiss(s.present, s.held, min);
  if (n === 0) {
    const need = mustAttend(s.present, s.held, min);
    return need > 0
      ? `You can't skip any ${label} classes. Attend the next ${need} to get back to ${Math.round(min * 100)}%.`
      : `You can't skip the next ${label} class.`;
  }
  const unit = isLab(s.name) ? (n === 1 ? "session" : "sessions") : n === 1 ? "class" : "classes";
  const name = isLab(s.name) && !/lab(oratory)?$/i.test(label) ? `${label} lab` : label;
  const base = `You can skip the next ${n} ${name} ${unit}`;
  const lab = labFor(s, all);
  if (!lab) return `${base}.`;
  const l = safeToMiss(lab.present, lab.held, min);
  return l > 0 ? `${base} and the next ${l} lab ${l === 1 ? "session" : "sessions"}.` : `${base}, but not the lab.`;
};

const ADVICE_WORD = { safe: "ok to skip", risky: "risky", must: "don't skip" } as const;

export const answer = (intent: Intent, data: AssistantData, today: string, nowMin = 0, text = ""): Reply => {
  const min = data.min ?? 0.75;
  const stat = intent.subject ? data.stats.find((s) => s.code === intent.subject) : undefined;
  const label = stat ? labelFor(stat, text) : "";
  const nameOf = (code: string | null) => data.stats.find((s) => s.code === code)?.name ?? (code ? data.names?.[code] : undefined) ?? code ?? "Class";

  switch (intent.kind) {
    case "attendance": {
      if (stat) return { text: `${label}: ${P(pct(stat.present, stat.held))} (${stat.present}/${stat.held}).` };
      const o = overall(data.stats);
      const lines = [...data.stats].sort((a, b) => pct(a.present, a.held) - pct(b.present, b.held))
        .map((s) => `• ${s.name}: ${P(pct(s.present, s.held))}`);
      return { text: [`Overall: ${P(pct(o.present, o.held))} (${o.present}/${o.held}).`, ...lines].join("\n") };
    }
    case "can_skip": {
      if (stat) return { text: canSkipLine(stat, label, data.stats, min) };
      return { text: data.stats.map((s) => `• ${s.name}: ${safeToMiss(s.present, s.held, min)}`).join("\n") };
    }
    case "cost_of_skip": {
      if (!stat) return { text: "Which subject?", options: data.stats.map((s) => s.name) };
      const c = costOfMiss(stat.present, stat.held);
      return { text: `Skipping the next ${label} class: ${P(c.before)} → ${P(c.after)}.` };
    }
    case "should_skip_day": {
      const date = intent.date ?? today;
      const slots = data.timetable
        .filter((t) => t.date === date && t.courseCode && !t.cancelled && (!intent.subject || t.courseCode === intent.subject))
        .sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
      if (!slots.length) return { text: `No${intent.subject ? ` ${label}` : ""} classes on ${prettyDate(date)}.` };
      const lines = slots.map((t) => {
        const s = data.stats.find((x) => x.code === t.courseCode);
        if (!s) return `• ${t.start} ${nameOf(t.courseCode)}`;
        const dl = data.deadlines.some((d) => d.due === date && d.courseCode === s.code);
        const adv = classAdvice(s, dl, min);
        const why = dl ? "deadline" : `→ ${P(costOfMiss(s.present, s.held).after)}`;
        return `• ${t.start} ${s.name}: ${ADVICE_WORD[adv]} (${why})`;
      });
      return { text: [`${prettyDate(date)}:`, ...lines].join("\n") };
    }
    case "next_class": {
      const next = data.timetable
        .filter((t) => t.courseCode && !t.cancelled && (t.date > today || (t.date === today && parseHHMM(t.start) >= nowMin)))
        .filter((t) => !intent.subject || t.courseCode === intent.subject)
        .sort((a, b) => (a.date === b.date ? parseHHMM(a.start) - parseHHMM(b.start) : a.date < b.date ? -1 : 1))[0];
      if (!next) return { text: "No upcoming classes." };
      return { text: `Next: ${nameOf(next.courseCode)}, ${prettyDate(next.date)} ${next.start}${next.room ? `, ${next.room}` : ""}.` };
    }
    case "events": {
      const from = intent.date ?? today;
      const to = intent.date ?? addDays(today, 14);
      const ev = data.events.filter((e) => e.end >= from && e.start <= to).sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, 6);
      if (!ev.length) return { text: intent.date ? `No events on ${prettyDate(intent.date)}.` : "No events in the next two weeks." };
      return { text: ev.map((e) => `• ${prettyDate(e.start)}: ${e.title}${e.cancelled ? " (cancelled)" : ""}${e.isHoliday ? " (holiday)" : ""}`).join("\n") };
    }
    case "open_section":
      return { text: `Opening ${intent.section}.`, navigate: `/${intent.section}` };
    case "open_classroom": {
      if (!stat) return { text: "Which subject?", options: data.stats.map((s) => s.name) };
      const url = data.classroom[stat.code];
      return url ? { text: `Opening ${label} in Google Classroom.`, openUrl: url } : { text: `No Classroom link for ${label}.` };
    }
    default:
      return { text: "Try:", options: HELP };
  }
};

/** The single entry point the UIs call. */
export const ask = (text: string, data: AssistantData, today: string, nowMin = 0): Reply => {
  const r = classify(text, data.stats, today);
  if ("clarify" in r) return { text: r.clarify, options: r.options };
  return answer(r, data, today, nowMin, text);
};
