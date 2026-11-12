import { levenshtein, normalize } from "./normalize";

export type Course = { code: string; name: string };
export type SubjectMatch = { code: string } | { ambiguous: string[] } | null;

const STOP = new Set(["and", "of", "the", "for", "in", "to", "a"]);
const LAB = /\b(lab|laboratory)\b/i;
const GENERIC = new Set(["lab", "laboratory", "theory", "systems", "system", "class", "classes"]);

const nameTokens = (name: string) => normalize(name).filter((t) => !STOP.has(t));

/** Acronyms: first letters of significant words; "database" contributes "db". Lab courses also get the acronym without "laboratory". */
export const acronyms = (name: string): string[] => {
  const words = nameTokens(name);
  const letter = (w: string) => (w === "database" ? "db" : w[0]);
  const out = [words.map(letter).join("")];
  const noLab = words.filter((w) => w !== "laboratory" && w !== "lab");
  if (noLab.length !== words.length) out.push(noLab.map(letter).join(""));
  return out.filter((a) => a.length >= 2);
};

const scoreCourse = (tokens: string[], c: Course): number => {
  const isLab = LAB.test(c.name);
  const saysLab = tokens.includes("lab") || tokens.includes("laboratory");
  if (isLab && !saysLab) return 0;
  const code = c.code.toLowerCase();
  const num = code.match(/(\d{3})$/)?.[1];
  const strong = new Set([...acronyms(c.name), code, ...(num ? [num] : [])]);
  const words = nameTokens(c.name).filter((w) => !GENERIC.has(w));
  let score = 0;
  for (const t of tokens) {
    if (strong.has(t)) score += 3;
    else if (t.length >= 3 && words.includes(t)) score += 1;
    else if (t.length >= 4 && words.some((w) => w.length >= 4 && levenshtein(t, w) <= 1)) score += 1;
  }
  if (score > 0 && isLab && saysLab) score += 1;
  return score;
};

export const matchSubject = (text: string, courses: Course[]): SubjectMatch => {
  const tokens = normalize(text);
  const scored = courses.map((c) => ({ c, s: scoreCourse(tokens, c) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) return null;
  const top = scored.filter((x) => x.s === scored[0].s);
  return top.length === 1 ? { code: top[0].c.code } : { ambiguous: top.map((x) => x.c.name) };
};
