import { describe, it, expect } from "vitest";
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

describe("demo QA round 2", () => {
  const base = { stats: [], timetable: [], deadlines: [], classroom: {} };
  const events = [
    { id: "1", title: "PTM-1", start: "2026-11-14", end: "2026-11-14", category: "EVENT", isHoliday: false, cancelled: false },
    { id: "2", title: "Kannada Rajyotsava", start: "2026-12-01", end: "2026-12-01", category: "HOLIDAY", isHoliday: true, cancelled: false },
  ];
  it("next holiday returns only holidays, looking past two weeks", () => {
    expect(ask("next holiday", { ...base, events }, "2026-11-12").text).toBe("• Tue 1 Dec: Kannada Rajyotsava (holiday)");
  });
  it("non-credit sessions are named, not shown as codes", () => {
    const timetable = [{ date: "2026-11-13", start: "13:45", end: "14:40", courseCode: "CP-PLACE", kind: "ACTIVITY", room: null, cancelled: false, extra: false }];
    expect(ask("can i skip tomorrow", { ...base, events: [], timetable, names: { "CP-PLACE": "Placement Training" } }, "2026-11-12").text).toContain("Placement Training");
  });
});

describe("official calendar events", () => {
  const base = { stats: [], timetable: [], deadlines: [], classroom: {} };
  const events = [
    { id: "t", title: "Theory Examination", start: "2027-01-07", end: "2027-01-23", category: "EXAMINATION", isHoliday: false, cancelled: false },
    { id: "p", title: "Practical Examination", start: "2027-01-25", end: "2027-02-01", category: "EXAMINATION", isHoliday: false, cancelled: false },
  ];
  it("a date inside a multi-day exam window finds that exam, in next year", () => {
    expect(ask("events on 10 jan", { ...base, events }, "2026-11-12").text).toBe("• Thu 7 Jan: Theory Examination");
  });
  it("exams are not reported as holidays", () => {
    expect(ask("next holiday", { ...base, events }, "2026-12-31").text).toBe("No holidays coming up this semester.");
  });
});
