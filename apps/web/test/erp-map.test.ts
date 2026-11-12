import { it, expect } from "vitest";
import { loadSnapshot } from "@/lib/erp/snapshot";
import { mapErp } from "@/lib/erp/map";

const raw = loadSnapshot();
const m = mapErp(raw, "2026-11-12");

it("stats come from ERP counts", () => {
  expect(m.stats.find((s) => s.code === "23CSPE311")).toMatchObject({ present: 18, held: 20, name: "Full Stack Development" });
  expect(m.stats).toHaveLength(8);
});
it("planned totals are at least held, and grow for weekly subjects", () => {
  for (const s of m.stats) expect(s.plannedTotal).toBeGreaterThanOrEqual(s.held);
  expect(m.stats.find((s) => s.code === "23MEOE313")!.plannedTotal).toBeGreaterThan(24);
});
it("timetable keeps breaks as null course and has no slots on holidays", () => {
  expect(m.timetable.find((t) => t.date === "2026-11-12" && t.kind === "BREAK")).toMatchObject({ courseCode: null });
  expect(m.timetable.some((t) => t.date === "2026-12-25")).toBe(false);
  expect(m.timetable.some((t) => t.date === "2026-11-13" && t.courseCode)).toBe(true); // future pattern
});
it("events and logs", () => {
  expect(m.events.find((e) => e.title === "CIE Test-2")).toMatchObject({ start: "2026-12-21", isHoliday: false });
  expect(m.logs.filter((l) => l.courseCode === "23CSPE311")).toHaveLength(20);
  expect(m.semester).toEqual({ start: "2026-09-07", end: "2026-12-30" });
});

it("uses the section's official template for future weeks when there is one", () => {
  const tpl = [
    { weekday: 1, start: "09:00", end: "09:55", options: ["23CSPC303"], kind: "THEORY" as const, room: "205" },
    { weekday: 1, start: "10:15", end: "12:05", options: ["ESDP01"], kind: "ACTIVITY" as const, room: "Audi-3" },
  ];
  const t = mapErp(raw, "2026-11-12", tpl);
  const mon = t.timetable.filter((x) => x.date === "2026-11-16");
  expect(mon.map((x) => `${x.start} ${x.courseCode} ${x.room}`)).toEqual(["09:00 23CSPC303 205", "10:15 ESDP01 Audi-3"]);
  // CN: held 23 + one Monday a week from 16 Nov to 30 Dec, minus the CIE/lab-test week Mondays (21 Dec, 28 Dec)
  expect(t.stats.find((s) => s.code === "23CSPC303")!.plannedTotal).toBe(23 + 5);
  expect(t.timetable.some((x) => x.date === "2026-11-12" && x.courseCode === "23CSPC305")).toBe(true); // ERP's own day kept
});
