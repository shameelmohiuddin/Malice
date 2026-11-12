import { it, expect } from "vitest";
import { isISODate, isClassroomUrl, adjustPlanned, safeToMiss, mustAttend } from "../src";
import { ask } from "../src/assistant/answer";
import { D, T } from "./fixtures";

it("validates dates and classroom urls", () => {
  expect(isISODate("2026-11-12")).toBe(true);
  expect(isISODate("x")).toBe(false);
  expect(isISODate("2026-13-40")).toBe(false);
  expect(isClassroomUrl("https://classroom.google.com/c/abc")).toBe(true);
  expect(isClassroomUrl("javascript:alert(1)")).toBe(false);
  expect(isClassroomUrl("https://evil.com/classroom.google.com")).toBe(false);
});

it("min outside (0,1) never yields NaN/Infinity", () => {
  expect(safeToMiss(5, 10, 0)).toBe(0);
  expect(mustAttend(5, 10, 1)).toBe(0);
});

it("assistant uses the student's minimum", () => {
  const r = ask("how many can i skip in fsd", { ...D, min: 0.85 }, T).text;
  expect(r).toContain("≥85%");
  expect(r).toContain("1 more"); // 18/20 at 85%: floor((18-17)/0.85)=1
});

it("planned totals follow teacher overrides from today on", () => {
  const stats = [{ code: "A", name: "A", present: 5, held: 6, plannedTotal: 20 }];
  const ov = [
    { id: "1", courseCode: "A", date: "2026-11-13", start: "09:00", end: "09:55", action: "cancel" as const, room: null },
    { id: "2", courseCode: "A", date: "2026-11-14", start: "10:00", end: "11:00", action: "extra" as const, room: null },
    { id: "3", courseCode: "A", date: "2026-11-15", start: "10:00", end: "11:00", action: "extra" as const, room: null },
    { id: "4", courseCode: "A", date: "2026-11-01", start: "10:00", end: "11:00", action: "extra" as const, room: null },
  ];
  expect(adjustPlanned(stats, ov, "2026-11-12")[0].plannedTotal).toBe(21);
});
