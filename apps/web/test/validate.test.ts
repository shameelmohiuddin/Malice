import { it, expect } from "vitest";
import { validateCancel, validateDeadline, validateEvent, validateExtra, validateMin, ValidationError } from "@/lib/validate";

it("cancel/extra", () => {
  expect(validateExtra({ section: "5CS3", courseCode: "X", date: "2026-11-13", start: "09:00", end: "09:55", room: " LH-1 " })).toMatchObject({ room: "LH-1" });
  expect(() => validateCancel({ section: "5CS3", courseCode: "X", date: "2026-11-13", start: "10:00", end: "09:00" })).toThrow(ValidationError);
  expect(() => validateCancel({ section: "5CS3; drop", courseCode: "X", date: "2026-11-13", start: "09:00", end: "10:00" })).toThrow("section");
  expect(() => validateCancel(null)).toThrow("JSON object");
});
it("event/deadline/min", () => {
  expect(validateEvent({ title: "Fest", start: "2026-11-20" })).toMatchObject({ end: "2026-11-20", category: "EVENT" });
  expect(() => validateEvent({ title: "x", start: "2026-11-20", end: "2026-11-19" })).toThrow("end");
  expect(() => validateDeadline({ title: "Q", due: "2026-11-20", kind: "party" })).toThrow("kind");
  expect(validateMin({ minAttendance: 85 })).toBe(0.85);
  expect(() => validateMin({ minAttendance: 100 })).toThrow();
});
