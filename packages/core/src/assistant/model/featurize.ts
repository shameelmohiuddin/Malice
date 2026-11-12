import { levenshtein, normalize } from "../normalize";
import { acronyms, type Course } from "../subjects";

/** Placeholders the model sees instead of the student's own subjects, dates, times and numbers. */
export const SUBJ = "xsubj", DATE = "xdate", TIME = "xtime", NUM = "xnum";

const DATE_WORDS = new Set([
  "today", "tonight", "tomorrow", "tmrw", "tmr", "tommorow", "tomorow", "yesterday",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "mon", "tue", "tues", "wed", "thu", "thur", "thurs", "fri", "sat", "sun",
  "jan", "january", "feb", "february", "mar", "march", "apr", "april", "jun", "june", "jul", "july",
  "aug", "august", "sep", "sept", "september", "oct", "october", "nov", "november", "dec", "december",
]);
const STOP = new Set(["and", "of", "the", "for", "in", "to", "a"]);
/** Two-letter acronyms that are also everyday words ("is it a holiday") are never treated as subjects. */
const COMMON = new Set(["it", "is", "as", "am", "an", "at", "be", "by", "do", "go", "he", "if", "in", "me", "my", "no", "of", "ok", "on", "or", "so", "to", "up", "us", "we"]);
const GENERIC = new Set(["lab", "laboratory", "theory", "systems", "system", "class", "classes", "development", "of", "and"]);

/** Words that name one of the student's subjects (acronyms, codes, significant name words). */
const subjectWords = (courses: Course[]) => {
  const exact = new Set<string>(), fuzzy: string[] = [];
  for (const c of courses) {
    acronyms(c.name).forEach((a) => exact.add(a));
    const all = normalize(c.name).map((w) => w[0]).join(""); // with small words too: "Internet of Things" → "iot"
    if (all.length >= 3) exact.add(all);
    const code = c.code.toLowerCase();
    exact.add(code);
    const num = code.match(/(\d{3})$/)?.[1];
    if (num) exact.add(num);
    for (const w of normalize(c.name)) if (!STOP.has(w) && !GENERIC.has(w) && w.length >= 3) { exact.add(w); if (w.length >= 5) fuzzy.push(w); }
  }
  COMMON.forEach((w) => exact.delete(w));
  return { exact, fuzzy };
};

/** Tokens with subjects, dates, times and numbers replaced by placeholders (repeats collapsed). */
export const maskTokens = (text: string, courses: Course[]): string[] => {
  const pre = text.toLowerCase()
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/g, ` ${TIME} `)
    .replace(/\b\d{1,2}[:.]\d{2}\b/g, ` ${TIME} `)
    .replace(/\b\d{1,2}(?:st|nd|rd|th)\b/g, ` ${DATE} `);
  const { exact, fuzzy } = subjectWords(courses);
  const out: string[] = [];
  for (const t of normalize(pre)) {
    const m = t === TIME || t === DATE ? t
      : exact.has(t) || (t.length >= 5 && fuzzy.some((w) => levenshtein(t, w) <= 1)) ? SUBJ
      : DATE_WORDS.has(t) || DATE_WORDS.has(t.replace(/(day)s$/, "$1")) ? DATE
      : /^\d+$/.test(t) ? NUM
      : t;
    if (out[out.length - 1] !== m || !m.startsWith("x")) out.push(m);
  }
  return out;
};

/** FNV-1a, 32-bit. */
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};

/** Hashed feature ids: words, word pairs, and letter trigrams (so typos still share features). */
export const features = (tokens: string[], buckets: number): number[] => {
  const f: string[] = [];
  tokens.forEach((t, i) => {
    f.push(`w:${t}`);
    if (i > 0) f.push(`b:${tokens[i - 1]}_${t}`);
    if (!t.startsWith("x") && t.length > 2) {
      const w = `<${t}>`;
      for (let j = 0; j + 3 <= w.length; j++) f.push(`c:${w.slice(j, j + 3)}`);
    }
  });
  return f.map((s) => hash(s) % buckets);
};
