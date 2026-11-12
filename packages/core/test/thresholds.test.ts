import { describe, it, expect } from "vitest";
import { MIN_ATTENDANCE, safeToMiss, mustAttend } from "../src";
import { ask } from "../src/assistant/answer";
import { D, T } from "./fixtures";

describe("MITE minimum attendance is 85%", () => {
  it("is the default", () => {
    expect(MIN_ATTENDANCE).toBe(0.85);
  });
  it("skip counts aim for 85% by default", () => {
    expect(safeToMiss(18, 20)).toBe(1); // 18/21 = 85.7%
    expect(mustAttend(11, 14)).toBe(6); // 17/20 = 85%
  });
  it("the assistant uses 85% when the student has no minimum set", () => {
    const at85 = { ...D, min: undefined };
    expect(ask("how many fsd classes can i skip", at85, T).text).toBe("You can skip the next 1 FSD class.");
    expect(ask("how many entrepreneurship classes can i skip", at85, T).text).toBe("You can't skip any Entrepreneurship classes. Attend the next 6 to get back to 85%.");
  });
});
