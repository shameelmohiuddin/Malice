import { classAdvice, costOfMiss, mustAttend, overall, pct, projection, safeToMiss } from "../attendance";
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
  instructors?: Record<string, string>; // course code → instructor
  advisor?: string | null; // class advisor
};
export type Reply = { text: string; navigate?: string; openUrl?: string; options?: string[] };

const P = (n: number) => `${n.toFixed(1)}%`;
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const prettyDate = (d: string) => `${DAY[weekday(d)]} ${+d.slice(8)} ${MON[+d.slice(5, 7) - 1]}`;

const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const EXAM = /\b(exam|examination|cie|gcie|test|tests|internal)\b|cie-|test-|-(?:1|2)md\b/i;

export const HELP = [
  "How many classes can I skip in DBMS?",
  "What if I skip FSD?",
  "Can I skip tomorrow?",
  "What's my attendance?",
  "When is my next class?",
  "Any events this week?",
  "Who teaches DBMS?",
  "When am I free tomorrow?",
  "What's due this week?",
  "When is the next holiday?",
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
  // The timetable only covers a window (about six weeks ahead); past it, "no classes" would be a guess.
  const lastDay = data.timetable.reduce((m, t) => (t.date > m ? t.date : m), today);
  const beyond = (d?: string) => (d && d > lastDay ? { text: `I can only see the timetable up to ${prettyDate(lastDay)}. Check the Timetable page closer to the date.` } : null);
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
      return { text: ["Classes you can still skip and stay at " + Math.round(min * 100) + "%:", ...data.stats.map((s) => `• ${s.name}: ${safeToMiss(s.present, s.held, min)}`)].join("\n") };
    }
    case "cost_of_skip": {
      if (!stat) return { text: "Which subject?", options: data.stats.map((s) => s.name) };
      const c = costOfMiss(stat.present, stat.held);
      return { text: `Skipping the next ${label} class: ${P(c.before)} → ${P(c.after)}.` };
    }
    case "should_skip_day": {
      const date = intent.date ?? today;
      const far = beyond(date); if (far) return far;
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
    case "day_schedule": {
      const date = intent.date ?? today;
      const far = beyond(date); if (far) return far;
      const all = data.timetable.filter((t) => t.date === date && t.courseCode).sort((a, b) => parseHHMM(a.start) - parseHHMM(b.start));
      if (intent.time !== undefined) {
        const at = all.find((t) => parseHHMM(t.start) <= intent.time! && parseHHMM(t.end) > intent.time!);
        return { text: at ? `${prettyDate(date)} ${hm(intent.time)}: ${nameOf(at.courseCode)}, ${at.start}–${at.end}${at.room ? `, ${at.room}` : ""}${at.cancelled ? " (cancelled)" : ""}.` : `No class at ${hm(intent.time)} on ${prettyDate(date)}.` };
      }
      const slots = all.filter((t) => !intent.subject || t.courseCode === intent.subject);
      if (!slots.length) {
        const off = data.events.find((e) => e.start <= date && e.end >= date && e.isHoliday && !e.cancelled);
        return { text: `No${intent.subject ? ` ${label}` : ""} classes on ${prettyDate(date)}${off ? ` (${off.title})` : ""}.` };
      }
      return { text: [`${prettyDate(date)}:`, ...slots.map((t) => `• ${t.start}–${t.end} ${nameOf(t.courseCode)}${t.room ? `, ${t.room}` : ""}${t.cancelled ? " (cancelled)" : ""}`)].join("\n") };
    }
    case "free_time": {
      const date = intent.date ?? today;
      const far = beyond(date); if (far) return far;
      const busy = data.timetable.filter((t) => t.date === date && t.courseCode && !t.cancelled)
        .map((t) => [parseHHMM(t.start), parseHHMM(t.end)] as const).sort((a, b) => a[0] - b[0]);
      if (!busy.length) return { text: `No classes on ${prettyDate(date)}, so you're free all day.` };
      if (intent.time !== undefined) {
        const at = busy.find(([a, b]) => a <= intent.time! && b > intent.time!);
        return { text: at ? `No, you have a class from ${hm(at[0])} to ${hm(at[1])}.` : `Yes, you're free at ${hm(intent.time)} on ${prettyDate(date)}.` };
      }
      const gaps: string[] = [];
      let cur = busy[0][1];
      for (const [a, b] of busy.slice(1)) { if (a - cur >= 30) gaps.push(`${hm(cur)}–${hm(a)}`); cur = Math.max(cur, b); }
      const from = date === today ? Math.max(nowMin, 0) : 0;
      const shown = gaps.filter((g) => parseHHMM(g.slice(6)) > from);
      return { text: `${prettyDate(date)}: ${shown.length ? `free ${shown.join(", ")} and ` : ""}after ${hm(cur)}.` };
    }
    case "instructor": {
      if (!stat) {
        if (data.advisor && /advis|coordinat|class teacher|mentor/i.test(text)) return { text: `Your class advisor is ${data.advisor}.` };
        return { text: "Which subject?", options: data.stats.map((s) => s.name) };
      }
      const who = data.instructors?.[stat.code];
      return { text: who ? `${label} is taught by ${who}.` : `I don't have the instructor for ${label}.` };
    }
    case "room": {
      const next = data.timetable
        .filter((t) => t.courseCode && !t.cancelled && (!intent.subject || t.courseCode === intent.subject) && (!intent.date || t.date === intent.date)
          && (t.date > today || (t.date === today && parseHHMM(t.end) > nowMin)))
        .sort((a, b) => (a.date === b.date ? parseHHMM(a.start) - parseHHMM(b.start) : a.date < b.date ? -1 : 1))[0];
      if (!next) return { text: intent.date ? `No${intent.subject ? ` ${label}` : ""} classes on ${prettyDate(intent.date)}.` : `No upcoming${intent.subject ? ` ${label}` : ""} classes.` };
      return { text: next.room ? `${nameOf(next.courseCode)} on ${prettyDate(next.date)} at ${next.start} is in ${next.room}.` : `No room is listed for ${nameOf(next.courseCode)} on ${prettyDate(next.date)}.` };
    }
    case "deadlines": {
      const to = intent.date ?? addDays(today, 60);
      const list = data.deadlines.filter((d) => d.due >= (intent.date ?? today) && d.due <= to && (!intent.subject || d.courseCode === intent.subject))
        .sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 6);
      if (!list.length) return { text: intent.date ? `Nothing due on ${prettyDate(intent.date)}.` : `No upcoming${intent.subject ? ` ${label}` : ""} deadlines.` };
      return { text: list.map((d) => `• ${prettyDate(d.due)}: ${d.title} (${d.kind})`).join("\n") };
    }
    case "holidays": {
      if (intent.date) {
        const h = data.events.find((e) => e.start <= intent.date! && e.end >= intent.date! && e.isHoliday && !e.cancelled);
        return { text: h ? `Yes, ${prettyDate(intent.date)} is a holiday (${h.title}).` : `No, ${prettyDate(intent.date)} is not a holiday.` };
      }
      const next = data.events.filter((e) => e.isHoliday && !e.cancelled && e.end >= today).sort((a, b) => (a.start < b.start ? -1 : 1));
      if (!next.length) return { text: "No holidays coming up this semester." };
      return { text: next.slice(0, /\bnext\b/i.test(text) ? 1 : 4).map((e) => `• ${prettyDate(e.start)}: ${e.title} (holiday)`).join("\n") };
    }
    case "exams": {
      const q = text.toLowerCase();
      const n = q.match(/\b(?:cie|test|internal)s?\s*-?\s*(\d)\b/)?.[1];
      // Narrow to the exam the student named, if any; otherwise every upcoming exam-like event.
      const want: RegExp | null = /make\s*-?\s*up/.test(q) ? /make-?up/i
        : /\b(sem|semester|final|finals|end|see|theory)\b/.test(q) ? /theory examination|semester end/i
        : /\bpractical\b/.test(q) ? /practical/i
        : /\blab\b/.test(q) ? /laboratory test|lab test|practical/i
        : /\bgcie\b/.test(q) ? /gcie/i
        : /\bcie\b|\binternals?\b/.test(q) ? (n ? new RegExp(`\\b(cie|test)[^0-9]*${n}\\b`, "i") : /cie/i)
        : null;
      const upcoming = data.events.filter((e) => e.end >= today && !e.cancelled && EXAM.test(e.title)).sort((a, b) => (a.start < b.start ? -1 : 1));
      const named = want ? upcoming.filter((e) => want.test(e.title)) : [];
      const list = (named.length ? named : upcoming).slice(0, named.length ? 2 : 4);
      if (!list.length) return { text: "No exams on the calendar yet." };
      return { text: list.map((e) => `• ${e.start === e.end ? prettyDate(e.start) : `${prettyDate(e.start)} – ${prettyDate(e.end)}`}: ${e.title}`).join("\n") };
    }
    case "projection": {
      const line = (s: CourseStats, name: string) => {
        const p = projection(s, min);
        return `${name}: ${p.remaining} classes left; attend them all and you finish at ${P(p.finalIfAllAttended)}; you can miss ${p.canMissRemaining} of them and stay at ${Math.round(min * 100)}%.`;
      };
      if (stat) return { text: line(stat, label) };
      return { text: data.stats.map((s) => `• ${line(s, s.name)}`).join("\n") };
    }
    case "out_of_scope":
      return { text: "I can only help with your classes, attendance, deadlines and events.", options: HELP.slice(0, 4) };
    case "events": {
      const tokens = normalize(text);
      const holidays = tokens.some((t) => t === "holiday" || t === "holidays");
      const from = intent.date ?? today;
      // Holidays are rarer, so look further ahead; "next holiday" means just the first one.
      const to = intent.date ?? addDays(today, holidays ? 180 : 14);
      const ev = data.events.filter((e) => e.end >= from && e.start <= to && (!holidays || (e.isHoliday && !e.cancelled)))
        .sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, holidays && tokens.includes("next") ? 1 : 6);
      if (!ev.length) return { text: holidays ? (intent.date ? `No holiday on ${prettyDate(intent.date)}.` : "No holidays coming up this semester.") : intent.date ? `No events on ${prettyDate(intent.date)}.` : "No events in the next two weeks." };
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
