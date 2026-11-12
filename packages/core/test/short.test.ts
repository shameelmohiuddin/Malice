import { it, expect } from "vitest";
import { shortName, attendanceStatus } from "../src";

it("short subject names", () => {
  expect(shortName("Database Management System")).toBe("DBMS");
  expect(shortName("Formal language and automata theory")).toBe("FLAT");
  expect(shortName("Computer Networks Laboratory")).toBe("CN LAB");
  expect(shortName("Physical Education - III")).toBe("PE");
  expect(shortName("Entrepreneurship, Management & Finance")).toBe("EMF");
  expect(shortName("Entrepreneurship")).toBe("Entrepreneurship");
});

it("attendance status is relative to the minimum", () => {
  expect(attendanceStatus(90, 0.75)).toBe("clear");
  expect(attendanceStatus(78.6, 0.75)).toBe("close");
  expect(attendanceStatus(74.9, 0.75)).toBe("below");
});
