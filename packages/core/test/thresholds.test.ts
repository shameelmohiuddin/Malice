import { describe, it, expect } from "vitest";
import { attendanceStatus, FLOOR_ATTENDANCE, MIN_ATTENDANCE, safeToMiss, mustAttend } from "../src";
import { ask } from "../src/assistant/answer";
import { D, T } from "./fixtures";

describe("MITE rule: 85% required, 75% floor", () => {
  it("defaults", () => {
    expect(MIN_ATTENDANCE).toBe(0.85);
    expect(FLOOR_ATTENDANCE).toBe(0.75);
  });
  it("standing has four levels", () => {
    expect(attendanceStatus(92, 0.85)).toBe("clear");
    expect(attendanceStatus(87, 0.85)).toBe("close");
    expect(attendanceStatus(80, 0.85)).toBe("condonation");
    expect(attendanceStatus(74.9, 0.85)).toBe("below");
    expect(attendanceStatus(75, 0.75)).toBe("close"); // a 75% minimum has no condonation zone
  });
  it("skip counts aim for 85% by default", () => {
    expect(safeToMiss(18, 20)).toBe(1); // 18/21 = 85.7%, 18/22 = 81.8%
    expect(mustAttend(11, 14)).toBe(6); // 17/20 = 85%
  });
  const at85 = { ...D, min: undefined };
  it("the assistant uses 85% and names the zone", () => {
    expect(ask("how many fsd classes can i skip", at85, T).text).toBe("You can skip the next 1 FSD class.");
    expect(ask("entrepreneurship attendance", at85, T).text).toBe("Entrepreneurship: 78.6% (11/14). Below 85%: in the condonation zone.");
    const low = { ...at85, stats: at85.stats.map((s) => (s.code === "23HMCC301" ? { ...s, present: 9, held: 14 } : s)) };
    expect(ask("entrepreneurship attendance", low, T).text).toBe("Entrepreneurship: 64.3% (9/14). Below 75%: not eligible without improvement.");
    expect(ask("how many entrepreneurship classes can i skip", at85, T).text).toBe("You can't skip any Entrepreneurship classes. Attend the next 6 to get back to 85%.");
  });
});
