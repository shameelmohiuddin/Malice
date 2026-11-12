import { describe, it, expect } from "vitest";
import { freeSlots, planStudy, mergeOverrides } from "../src/planner";
import { parseHHMM } from "../src/dates";
import type { TimetableSlot, Deadline } from "../src/types";

const s = (date: string, start: string, end: string, courseCode: string | null, kind = "THEORY", cancelled = false): TimetableSlot =>
  ({ date, start, end, courseCode, kind, room: null, cancelled, extra: false });

// A full-ish day: classes 9-12:05, lunch 12:05-12:50, lab 12:50-14:40
const day = (date: string) => [
  s(date, "09:00", "09:55", "A"), s(date, "09:55", "10:15", null, "BREAK"), s(date, "10:15", "11:10", "B"),
  s(date, "11:10", "12:05", "C"), s(date, "12:05", "12:50", null, "LUNCH"), s(date, "12:50", "14:40", "D", "LAB"),
];
const tt = [...day("2026-11-12"), ...day("2026-11-13")];
const mins = (b: { start: string; end: string }) => parseHHMM(b.end) - parseHHMM(b.start);
const overlaps = (b: { date: string; start: string; end: string }, t: TimetableSlot[]) =>
  t.some((x) => x.date === b.date && !x.cancelled && parseHHMM(b.start) < parseHHMM(x.end) && parseHHMM(x.start) < parseHHMM(b.end));

describe("freeSlots", () => {
  it("excludes classes, breaks and lunch; cancelled classes become free", () => {
    expect(freeSlots(tt, "2026-11-12")).toEqual([{ start: "14:40", end: "17:00" }, { start: "18:00", end: "21:00" }]);
    const c = tt.map((x) => (x.date === "2026-11-12" && x.courseCode === "B" ? { ...x, cancelled: true } : x));
    expect(freeSlots(c, "2026-11-12")[0]).toEqual({ start: "10:15", end: "11:10" });
  });
});

describe("planStudy", () => {
  const q: Deadline = { id: "q", courseCode: "A", title: "Quiz A", due: "2026-11-14", kind: "quiz" };
  it("places 2h for a quiz with no clashes", () => {
    const { blocks, unplaced } = planStudy(tt, [q], "2026-11-12");
    expect(blocks.reduce((a, b) => a + mins(b), 0)).toBe(120);
    expect(blocks.every((b) => !overlaps(b, tt))).toBe(true);
    expect(unplaced).toEqual([]);
  });
  it("earliest deadline gets earliest slots", () => {
    const e: Deadline = { id: "e", courseCode: "B", title: "Exam B", due: "2026-11-20", kind: "exam" };
    const { blocks } = planStudy(tt, [e, q], "2026-11-12");
    expect(blocks[0].deadlineId).toBe("q");
  });
  it("due today cannot be planned", () => {
    expect(planStudy(tt, [{ ...q, due: "2026-11-12" }], "2026-11-12").unplaced).toEqual([{ deadlineId: "q", hoursShort: 2 }]);
  });
  it("caps 3h per day", () => {
    const e: Deadline = { id: "e", courseCode: "B", title: "Exam", due: "2026-11-13", kind: "exam" };
    const r = planStudy(tt, [e], "2026-11-12");
    expect(r.blocks.reduce((a, b) => a + mins(b), 0)).toBe(180);
    expect(r.unplaced).toEqual([{ deadlineId: "e", hoursShort: 1 }]);
  });
});

describe("mergeOverrides", () => {
  it("cancel and extra", () => {
    const m = mergeOverrides(tt, [
      { id: "1", courseCode: "B", date: "2026-11-13", start: "10:15", end: "11:10", action: "cancel", room: null },
      { id: "2", courseCode: "C", date: "2026-11-14", start: "10:00", end: "11:00", action: "extra", room: "LH-A203" },
    ]);
    expect(m.find((x) => x.date === "2026-11-13" && x.courseCode === "B")!.cancelled).toBe(true);
    expect(m.find((x) => x.date === "2026-11-14")).toMatchObject({ courseCode: "C", extra: true, cancelled: false, room: "LH-A203" });
    expect(m.find((x) => x.date === "2026-11-12" && x.courseCode === "B")!.cancelled).toBe(false);
  });
});
