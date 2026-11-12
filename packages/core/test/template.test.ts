import { it, expect } from "vitest";
import { expandTemplate, type TemplateSlot } from "../src";

const T: TemplateSlot[] = [
  { weekday: 2, start: "09:00", end: "09:55", options: ["OE*"], kind: "THEORY", room: "203" },
  { weekday: 2, start: "09:55", end: "10:15", options: [], kind: "BREAK", room: null },
  { weekday: 2, start: "11:10", end: "12:05", options: ["23CSPE312"], kind: "THEORY", room: "205" },
  { weekday: 2, start: "11:10", end: "13:00", options: ["23CSPE311"], kind: "LAB", room: "LB A103" },
  { weekday: 2, start: "12:05", end: "12:50", options: [], kind: "LUNCH", room: null },
  { weekday: 1, start: "14:40", end: "15:35", options: ["CP-WIPRO"], kind: "ACTIVITY", room: null },
  { weekday: 3, start: "15:35", end: "16:30", options: ["23NMCC321", "23NMCC322", "23NMCC323", "23NMCC324"], kind: "THEORY", room: null },
];
const enrolled = new Set(["23MEOE313", "23CSPE311", "23NMCC322"]);

it("resolves electives and open electives per student, keeps activities", () => {
  const s = expandTemplate(T, enrolled, "2026-11-16", "2026-11-18", new Set()); // Mon–Wed
  expect(s.map((x) => `${x.date} ${x.start} ${x.courseCode} ${x.kind}`)).toEqual([
    "2026-11-16 14:40 CP-WIPRO ACTIVITY",
    "2026-11-17 09:00 23MEOE313 THEORY",
    "2026-11-17 09:55 null BREAK",
    "2026-11-17 11:10 23CSPE311 LAB",
    "2026-11-18 15:35 23NMCC322 THEORY",
  ]); // IoT dropped (not enrolled); lunch dropped because the FSD lab runs through it
});

it("skips no-class dates and Sundays", () => {
  const s = expandTemplate(T, enrolled, "2026-11-15", "2026-11-17", new Set(["2026-11-17"]));
  expect(s.map((x) => x.date)).toEqual(["2026-11-16"]);
});
