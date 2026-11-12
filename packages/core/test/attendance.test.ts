import { describe, it, expect } from "vitest";
import { pct, costOfMiss, safeToMiss, mustAttend, projection, classAdvice, overall } from "../src/attendance";

const F = { code: "F", name: "F", present: 18, held: 20, plannedTotal: 36 };

describe("attendance maths", () => {
  it("pct", () => {
    expect(pct(18, 20)).toBe(90);
    expect(pct(0, 0)).toBe(100);
  });
  it("costOfMiss", () => {
    expect(costOfMiss(18, 20)).toEqual({ before: 90, after: 85.7, drop: 4.3 });
    expect(costOfMiss(0, 0)).toEqual({ before: 100, after: 0, drop: 100 });
  });
  it("safeToMiss", () => {
    expect(safeToMiss(18, 20)).toBe(4);
    expect(safeToMiss(11, 14)).toBe(0);
    expect(safeToMiss(0, 0)).toBe(0);
  });
  it("mustAttend", () => {
    expect(mustAttend(10, 15)).toBe(5);
    expect(mustAttend(18, 20)).toBe(0);
    expect(mustAttend(0, 0)).toBe(0);
  });
  it("projection", () => {
    expect(projection(F)).toEqual({ remaining: 16, canMissRemaining: 7, finalIfAllAttended: 94.4 });
    expect(projection({ ...F, present: 0, held: 0, plannedTotal: 0 })).toEqual({ remaining: 0, canMissRemaining: 0, finalIfAllAttended: 100 });
  });
  it("classAdvice", () => {
    expect(classAdvice({ code: "H", name: "H", present: 11, held: 14, plannedTotal: 30 }, false)).toBe("must");
    expect(classAdvice(F, true)).toBe("must");
    expect(classAdvice(F, false)).toBe("safe");
    expect(classAdvice({ ...F, present: 16, held: 20 }, false)).toBe("risky"); // 16/21 = 76.2
  });
  it("overall sums", () => {
    expect(overall([F, { code: "G", name: "G", present: 2, held: 4, plannedTotal: 10 }]))
      .toEqual({ code: "ALL", name: "Overall", present: 20, held: 24, plannedTotal: 46 });
  });
});
