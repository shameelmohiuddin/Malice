import { addDays, nextWeekday, weekday, WEEKDAYS } from "../dates";
import { normalize } from "./normalize";
import { matchSubject, type Course } from "./subjects";
import { loadModel, type Model, type ModelIntent } from "./model/net";
import { WEIGHTS } from "./model/weights";

export type Section = "dashboard" | "timetable" | "calendar" | "planner" | "settings";
export type IntentKind = ModelIntent;
export type Intent = { kind: IntentKind; subject?: string; date?: string; section?: Section; time?: number; confidence?: number };
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
  if (tokens.includes("yesterday")) return addDays(today, -1);
  for (const t of tokens) {
    let wd = WEEKDAYS.indexOf(t.replace(/(day)s$/, "$1")); // "monday's" normalises to "mondays"
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

/** "2pm", "at 10:15", "9 am" → minutes since midnight. Bare hours 1–7 are read as afternoon (college hours). */
export const extractTime = (text: string): number | undefined => {
  const m = text.toLowerCase().match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/) ?? text.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (!m) return undefined;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  if (h > 23 || min > 59) return undefined;
  if (m[3] === "pm" && h < 12) h += 12;
  else if (m[3] === "am" && h === 12) h = 0;
  else if (!m[3] && h >= 1 && h <= 7) h += 12;
  return h * 60 + min;
};

let model: Model | null = null;
/** ClassPilot's own intent model (trained by training/train.ts, runs on-device). */
export const intentModel = () => (model ??= loadModel(WEIGHTS));

/** Below this the model is unsure, and the assistant offers its two best guesses instead of answering. */
export const MIN_CONFIDENCE = 0.4;

/** How a chip phrases each intent, so tapping it asks a question the model is sure about. */
const PHRASE: Record<IntentKind, (subject?: string) => string> = {
  attendance: (s) => (s ? `${s} attendance` : "What's my attendance?"),
  can_skip: (s) => `How many ${s ?? ""} classes can I skip?`.replace("  ", " "),
  cost_of_skip: (s) => `What if I skip ${s ?? "the next class"}?`,
  should_skip_day: () => "Can I skip tomorrow?",
  next_class: (s) => `When is my next ${s ? `${s} ` : ""}class?`,
  day_schedule: () => "What classes do I have tomorrow?",
  free_time: () => "When am I free tomorrow?",
  instructor: (s) => (s ? `Who teaches ${s}?` : "Who is our class advisor?"),
  room: (s) => (s ? `Which room is ${s}?` : "Where is my next class?"),
  deadlines: () => "What's due this week?",
  events: () => "Any events this week?",
  holidays: () => "When is the next holiday?",
  exams: () => "When are the exams?",
  projection: (s) => `How many ${s ? `${s} ` : ""}classes are left this semester?`,
  open_section: () => "Open planner",
  open_classroom: (s) => `Open classroom for ${s ?? "FSD"}`,
  help: () => "What can you do?",
  out_of_scope: () => "What can you do?",
};

export const classify = (text: string, courses: Course[], today: string): Intent | Clarify => {
  const tokens = normalize(text);
  const date = extractDate(tokens, today);
  const time = extractTime(text);
  const m = matchSubject(text, courses);
  if (m && "ambiguous" in m) return { clarify: "Which subject do you mean?", options: m.ambiguous };
  const subject = m?.code;

  // Commands are exact: "open planner", "classroom for fsd".
  const nav = has(tokens, "open", "go", "goto", "navigate", "take");
  if (has(tokens, "classroom")) return { kind: "open_classroom", subject, date };
  if (nav && tokens.some((t) => SECTIONS[t])) return { kind: "open_section", section: SECTIONS[tokens.find((t) => SECTIONS[t])!] };

  const p = intentModel().predict(text, courses);
  if (!p.known) return { kind: "help" };
  let kind: IntentKind = p.intent;
  if (kind === "open_section" || kind === "open_classroom") kind = "help"; // only the exact command rules above may navigate
  if (p.confidence < MIN_CONFIDENCE) {
    const label = subject ? courses.find((c) => c.code === subject)?.name : undefined;
    const options = [...new Set(p.ranked.filter((r) => r.intent !== "open_section" && r.intent !== "open_classroom").slice(0, 2).map((r) => PHRASE[r.intent](label)))];
    return { clarify: "Did you mean:", options };
  }

  // A subject was named ("in X", "for X") but we don't know it: say so instead of guessing.
  const needsSubject: IntentKind[] = ["attendance", "can_skip", "cost_of_skip", "instructor", "room", "projection", "next_class"];
  if (!subject && needsSubject.includes(kind)) {
    const named = tokens.join(" ").match(/\b(?:in|for|of)\s+([a-z][a-z0-9 ]{2,})$/);
    if (named && !extractDate(normalize(named[1]), today) && !/\b(sem|semester|week|month|college|all|everything|subjects?|total)\b/.test(named[1])) {
      return { clarify: `I don't have a subject called "${named[1].trim()}". Pick one:`, options: courses.map((c) => c.name) };
    }
  }
  return { kind, subject, date, time, confidence: p.confidence };
};
