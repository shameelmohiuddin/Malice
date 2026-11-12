import { describe, it, expect } from "vitest";
import { classify } from "../src/assistant/intents";
import { matchSubject } from "../src/assistant/subjects";
import { ask } from "../src/assistant/answer";
import { C, T, D } from "./fixtures";

describe("subject matching", () => {
  it("acronyms, codes, labs", () => {
    expect(matchSubject("flat", C)).toEqual({ code: "23CSPC304" });
    expect(matchSubject("fsd", C)).toEqual({ code: "23CSPE311" });
    expect(matchSubject("304", C)).toEqual({ code: "23CSPC304" });
    expect(matchSubject("cn lab", C)).toEqual({ code: "23CSPC305" });
    expect(matchSubject("hello there", C)).toBeNull();
  });
});

describe("classify", () => {
  it("intents", () => {
    expect(classify("how many classes can I bunk in FLAT", C, T)).toMatchObject({ kind: "can_skip", subject: "23CSPC304" });
    expect(classify("whats my dbms attendance", C, T)).toMatchObject({ kind: "attendance", subject: "23CSPC302" });
    expect(classify("cn lab attendance", C, T)).toMatchObject({ subject: "23CSPC305" });
    expect(classify("can i skip cn tomorrow", C, T)).toMatchObject({ subject: "23CSPC303" });
    expect(classify("development attendance", C, T)).toMatchObject({ clarify: expect.any(String), options: ["Full Stack Development", "Product Development"] });
    expect(classify("what if i skip full stak", C, T)).toMatchObject({ kind: "cost_of_skip", subject: "23CSPE311" });
    expect(classify("open calendar", C, T)).toMatchObject({ kind: "open_section", section: "calendar" });
    expect(classify("should i skip on friday", C, T)).toMatchObject({ kind: "should_skip_day", date: "2026-11-13" });
    expect(classify("asdfgh", C, T)).toMatchObject({ kind: "help" });
    expect(classify("attendance in quantum physics", C, T)).toMatchObject({ clarify: expect.stringContaining("don't have") });
    expect(classify("open classroom for fsd", C, T)).toMatchObject({ kind: "open_classroom", subject: "23CSPE311" });
    expect(classify("what's my attendance", C, T)).toMatchObject({ kind: "attendance", subject: undefined });
    expect(classify("events on 14th", C, T)).toMatchObject({ kind: "events", date: "2026-11-14" });
  });
});

describe("ask", () => {
  it("answers", () => {
    expect(ask("how many can i skip in fsd", D, T).text).toContain("next 4");
    expect(ask("what if i skip fsd", D, T).text).toContain("90.0% → 85.7%");
    expect(ask("open timetable", D, T).navigate).toBe("/timetable");
    expect(ask("open classroom for fsd", D, T).openUrl).toBe("https://classroom.google.com/c/abc");
    const day = ask("can i skip tomorrow", D, T).text;
    expect(day).toContain("Entrepreneurship");
    expect(day).toContain("don't skip");
    expect(ask("my attendance", D, T).text).toContain("Overall");
  });
});

describe("unknown subject with punctuation", () => {
  it("asks instead of guessing", () => {
    expect(classify("How many classes can I skip in quantum?", C, T)).toMatchObject({ clarify: expect.stringContaining("don't have") });
    expect(classify("attendance in quantum physics?", C, T)).toMatchObject({ clarify: expect.stringContaining("don't have") });
    expect(classify("How many classes can I skip in DBMS?", C, T)).toMatchObject({ kind: "can_skip", subject: "23CSPC302" });
  });
});
