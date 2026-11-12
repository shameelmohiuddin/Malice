import { it, expect } from "vitest";
import { courseView, dashboardView, syncCooldownLeft } from "../src/view";
import { stats, timetable, T } from "./fixtures";

it("courseView computes everything a card needs", () => {
  const fsd = stats.find((s) => s.code === "23CSPE311")!;
  expect(courseView(fsd, { min: 0.75, deadlineToday: false })).toEqual({
    code: "23CSPE311", name: "Full Stack Development", present: 18, held: 20, plannedTotal: 36,
    percent: 90, advice: "safe", canSkip: 4, mustAttend: 0,
    skipNext: { before: 90, after: 85.7, drop: 4.3 },
    semester: { remaining: 16, canMissRemaining: 7, finalIfAllAttended: 94.4 },
  });
});

it("dashboardView sorts riskiest first and lists today's classes", () => {
  const d = dashboardView({ stats, timetable, deadlines: [], today: "2026-11-13", min: 0.75 });
  expect(d.courses[0].code).toBe("23HMCC301");          // 78.6% is lowest
  expect(d.overall.percent).toBe(91.9);
  expect(d.nearLimit).toBe(1);
  expect(d.today.map((t) => t.courseCode)).toEqual(["23HMCC301", "23CSPE311"]); // lunch excluded
  expect(d.today[0]).toMatchObject({ advice: "must", courseName: "Entrepreneurship" });
});

it("sync cooldown", () => {
  const now = new Date("2026-11-12T10:00:30Z");
  expect(syncCooldownLeft("2026-11-12T10:00:00Z", now, 60)).toBe(30);
  expect(syncCooldownLeft("2026-11-12T09:58:00Z", now, 60)).toBe(0);
  expect(syncCooldownLeft(null, now, 60)).toBe(0);
});
