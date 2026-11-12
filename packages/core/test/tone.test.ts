import { it, expect } from "vitest";
import { ask } from "../src/assistant/answer";
import { D, T } from "./fixtures";

const withLab = (present: number) => ({ ...D, stats: D.stats.map((s) => (s.code === "23CSPC305" ? { ...s, present } : s)) });

it("answers skip questions plainly, using the name the user typed", () => {
  expect(ask("how many classes of my DBMS can I skip", D, T).text).toBe("You can skip the next 7 DBMS classes.");
  expect(ask("how many classes can i skip in full stack development", D, T).text).toBe("You can skip the next 4 Full Stack Development classes.");
});

it("mentions the lab separately", () => {
  expect(ask("how many cn classes can i skip", withLab(13), T).text).toBe("You can skip the next 3 CN classes, but not the lab.");
  expect(ask("how many cn classes can i skip", D, T).text).toBe("You can skip the next 3 CN classes and the next 5 lab sessions.");
});

it("no skips left is stated plainly", () => {
  expect(ask("how many entrepreneurship classes can i skip", D, T).text).toBe("You can't skip the next Entrepreneurship class.");
  const low = { ...D, stats: D.stats.map((s) => (s.code === "23CSPE311" ? { ...s, present: 10, held: 15 } : s)) };
  expect(ask("how many fsd classes can i skip", low, T).text).toBe("You can't skip any FSD classes. Attend the next 5 to get back to 75%.");
});

it("other answers are short", () => {
  expect(ask("dbms attendance", D, T).text).toBe("DBMS: 96.2% (25/26).");
  expect(ask("what if i skip fsd", D, T).text).toBe("Skipping the next FSD class: 90.0% → 85.7%.");
  expect(ask("asdf", D, T).text).toBe("Try:");
});
