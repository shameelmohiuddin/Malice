import { it, expect } from "vitest";
import { dashboardView, mergeOverrides, overlaps } from "../src";
import { ask } from "../src/assistant/answer";
import { D, T, stats, timetable } from "./fixtures";

it("M1: classes that already ended today get no advice", () => {
  const tt = [...timetable, { date: T, start: "09:00", end: "09:55", courseCode: "23HMCC301", kind: "THEORY", room: null, cancelled: false, extra: false },
    { date: T, start: "12:50", end: "13:45", courseCode: "23CSPE311", kind: "THEORY", room: null, cancelled: false, extra: false }];
  const d = dashboardView({ stats, timetable: tt, deadlines: [], today: T, min: 0.75, nowMin: 11 * 60 });
  expect(d.today.map((x) => [x.start, x.advice, x.past])).toEqual([["09:00", null, true], ["12:50", "safe", false]]);
});

it("M2: asking about the lab answers in lab sessions", () => {
  expect(ask("how many cn lab classes can i skip", D, T).text).toBe("You can skip the next 5 CN lab sessions.");
  expect(ask("can i bunk cn lab", D, T).text).toBe("You can skip the next 5 CN lab sessions.");
});

it("M6: merged timetable is sorted by date then start", () => {
  const m = mergeOverrides(timetable, [{ id: "x", courseCode: "23CSPC302", date: "2026-11-13", start: "08:00", end: "08:55", action: "extra", room: null }]);
  const keys = m.map((s) => s.date + s.start);
  expect(keys).toEqual([...keys].sort());
});

it("I4: time overlap helper", () => {
  expect(overlaps("09:00", "09:55", "09:30", "10:00")).toBe(true);
  expect(overlaps("09:00", "09:55", "09:55", "10:15")).toBe(false);
});

it("M2: full lab name is not doubled", () => {
  expect(ask("how many computer networks laboratory classes can i skip", D, T).text).toBe("You can skip the next 5 Computer Networks Laboratory sessions.");
});
