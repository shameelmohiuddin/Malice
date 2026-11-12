import { addDays, nextWeekday, weekday, WEEKDAYS } from "../dates";
import { normalize } from "./normalize";
import { matchSubject, type Course } from "./subjects";

export type Section = "dashboard" | "timetable" | "calendar" | "planner" | "settings";
export type IntentKind =
  | "attendance" | "can_skip" | "cost_of_skip" | "should_skip_day" | "next_class"
  | "events" | "open_section" | "open_classroom" | "help";
export type Intent = { kind: IntentKind; subject?: string; date?: string; section?: Section };
export type Clarify = { clarify: string; options: string[] };

const SECTIONS: Record<string, Section> = {
  home: "dashboard", dashboard: "dashboard", timetable: "timetable", schedule: "timetable",
  calendar: "calendar", events: "calendar", planner: "planner", plan: "planner", study: "planner",
  settings: "settings", sync: "settings",
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const SHORT_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const pad = (n: number) => String(n).padStart(2, "0");

export const extractDate = (tokens: string[], today: string): string | undefined => {
  const s = tokens.join(" ");
  if (/\bday after tomorrow\b/.test(s)) return addDays(today, 2);
  if (tokens.includes("tomorrow") || tokens.includes("tmrw") || tokens.includes("tmr")) return addDays(today, 1);
  if (tokens.includes("today") || tokens.includes("tonight")) return today;
  for (const t of tokens) {
    let wd = WEEKDAYS.indexOf(t);
    if (wd < 0) wd = SHORT_DAYS.indexOf(t);
    if (wd >= 0) return wd === weekday(today) && !/\bnext\b/.test(s) ? today : nextWeekday(today, wd);
  }
  const [ty, tm, td] = today.split("-").map(Number);
  const dm = s.match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\b/);
  const md = s.match(/\b([a-z]{3})[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  for (const [day, mon] of [dm ? [dm[1], dm[2]] : null, md ? [md[2], md[1]] : null].filter(Boolean) as string[][]) {
    const mi = MONTHS.indexOf(mon);
    if (mi >= 0 && +day >= 1 && +day <= 31) return `${mi + 1 < tm - 6 ? ty + 1 : ty}-${pad(mi + 1)}-${pad(+day)}`;
  }
  const ord = s.match(/\b(\d{1,2})(st|nd|rd|th)\b/) ?? s.match(/\bon (\d{1,2})\b/);
  if (ord && +ord[1] >= 1 && +ord[1] <= 31) {
    const d = +ord[1];
    if (d >= td) return `${ty}-${pad(tm)}-${pad(d)}`;
    return tm === 12 ? `${ty + 1}-01-${pad(d)}` : `${ty}-${pad(tm + 1)}-${pad(d)}`;
  }
  return undefined;
};

const has = (tokens: string[], ...words: string[]) => words.some((w) => tokens.includes(w));

export const classify = (text: string, courses: Course[], today: string): Intent | Clarify => {
  const tokens = normalize(text);
  const date = extractDate(tokens, today);
  const m = matchSubject(text, courses);
  if (m && "ambiguous" in m) return { clarify: "Which subject do you mean?", options: m.ambiguous };
  const subject = m?.code;

  let kind: IntentKind = "help";
  let section: Section | undefined;
  const nav = has(tokens, "open", "go", "goto", "navigate", "take");
  if (has(tokens, "classroom")) kind = "open_classroom";
  else if (nav && tokens.some((t) => SECTIONS[t])) {
    kind = "open_section";
    section = SECTIONS[tokens.find((t) => SECTIONS[t])!];
  } else if (has(tokens, "skip")) {
    if (has(tokens, "if", "happens", "lose", "drop", "cost", "what")) kind = "cost_of_skip";
    else if (date) kind = "should_skip_day";
    else kind = "can_skip";
  } else if (has(tokens, "attendance")) kind = "attendance";
  else if (has(tokens, "event", "events", "holiday", "holidays", "happening", "fest")) kind = "events";
  else if (has(tokens, "next") && has(tokens, "class", "lecture", "period")) kind = "next_class";
  else if (subject) kind = "attendance";

  // A subject was named ("in X", "for X") but we don't know it: say so instead of guessing.
  if (!subject && kind !== "help" && kind !== "open_section" && kind !== "events" && kind !== "should_skip_day") {
    const named = tokens.join(" ").match(/\b(?:in|for|of)\s+([a-z][a-z0-9 ]{2,})$/);
    if (named && !extractDate(normalize(named[1]), today)) {
      return { clarify: `I don't have a subject called "${named[1].trim()}". Pick one:`, options: courses.map((c) => c.name) };
    }
  }
  return { kind, subject, date, section };
};
