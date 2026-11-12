import { isISODate } from "@classpilot/core";

export class ValidationError extends Error {}
const TIME = /^\d{2}:\d{2}$/;
const SECTION = /^[A-Za-z0-9-]{1,20}$/;
const KINDS = ["exam", "quiz", "assignment"] as const;
type Obj = Record<string, unknown>;
const str = (o: Obj, k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
const need = (cond: boolean, msg: string) => { if (!cond) throw new ValidationError(msg); };
const obj = (x: unknown): Obj => { need(!!x && typeof x === "object", "Expected a JSON object"); return x as Obj; };

export const validateCancel = (x: unknown) => {
  const o = obj(x);
  const v = { section: str(o, "section"), courseCode: str(o, "courseCode"), date: str(o, "date"), start: str(o, "start"), end: str(o, "end") };
  need(SECTION.test(v.section), "Invalid section");
  need(!!v.courseCode, "courseCode is required");
  need(isISODate(v.date), "date must be YYYY-MM-DD");
  need(TIME.test(v.start) && TIME.test(v.end) && v.start < v.end, "start/end must be HH:MM with end after start");
  return v;
};
export const validateExtra = (x: unknown) => ({ ...validateCancel(x), room: str(obj(x), "room") || null });

export const validateEvent = (x: unknown) => {
  const o = obj(x);
  const start = str(o, "start");
  const v = { title: str(o, "title"), start, end: str(o, "end") || start, category: str(o, "category") || "EVENT" };
  need(v.title.length > 0 && v.title.length <= 120, "title is required (max 120 chars)");
  need(isISODate(v.start) && isISODate(v.end) && v.end >= v.start, "end must be on or after start (YYYY-MM-DD)");
  return v;
};

export const validateDeadline = (x: unknown) => {
  const o = obj(x);
  const v = { title: str(o, "title"), courseCode: str(o, "courseCode") || null, due: str(o, "due"), kind: str(o, "kind") as (typeof KINDS)[number], section: str(o, "section") || null };
  need(v.title.length > 0 && v.title.length <= 120, "title is required (max 120 chars)");
  need(isISODate(v.due), "due must be YYYY-MM-DD");
  need(KINDS.includes(v.kind), "kind must be exam, quiz or assignment");
  need(!v.section || SECTION.test(v.section), "Invalid section");
  return v;
};

export const validateMin = (x: unknown) => {
  const n = Number(obj(x).minAttendance);
  need(Number.isFinite(n) && n >= 50 && n <= 95, "minAttendance must be a percentage between 50 and 95");
  return n / 100;
};
