import { it, expect } from "vitest";
import { todayIST, addDays, weekday, nextWeekday, parseHHMM } from "../src/dates";

it("todayIST respects the IST boundary", () => {
  expect(todayIST(new Date("2026-11-12T18:00:00Z"))).toBe("2026-11-12");
  expect(todayIST(new Date("2026-11-12T18:31:00Z"))).toBe("2026-11-13");
});
it("date helpers", () => {
  expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  expect(weekday("2026-11-12")).toBe(4);
  expect(nextWeekday("2026-11-12", 5)).toBe("2026-11-13");
  expect(nextWeekday("2026-11-12", 4)).toBe("2026-11-19");
  expect(parseHHMM("13:45")).toBe(825);
  expect(parseHHMM("13:45:00")).toBe(825);
});
