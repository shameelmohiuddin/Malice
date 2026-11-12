import { describe, it, expect } from "vitest";
import { classify, extractTime, intentModel } from "../src/assistant/intents";
import { ask } from "../src/assistant/answer";
import { maskTokens } from "../src/assistant/model/featurize";
import { WEIGHTS } from "../src/assistant/model/weights";
import { expand, POOL, splitTemplates } from "../training/dataset";
import { REAL_WORLD } from "../training/real-world";
import { C, D, T } from "./fixtures";

const accuracy = (xs: { text: string; intent: string }[]) =>
  xs.filter((x) => intentModel().predict(x.text, POOL).intent === x.intent).length / xs.length;

describe("intent model", () => {
  it("understands real student questions it was never trained on", () => {
    expect(accuracy(REAL_WORLD)).toBeGreaterThanOrEqual(0.95);
  });
  it("generalises to held-out phrasings", () => {
    expect(accuracy(expand(splitTemplates().test, 4, 99))).toBeGreaterThanOrEqual(0.88);
  });
  it("is small enough to ship inside the apps", () => {
    expect(JSON.stringify(WEIGHTS).length).toBeLessThan(200_000);
  });
  it("masks the student's own subjects, dates and times", () => {
    expect(maskTokens("can i bunk DBMS tomorrow at 2pm", C)).toEqual(["can", "i", "skip", "xsubj", "xdate", "at", "xtime"]);
    expect(maskTokens("is it a holiday on 14th", C)).toEqual(["is", "it", "a", "holiday", "on", "xdate"]);
  });
  it("tolerates typos", () => {
    expect(classify("whos teching dbms", C, T)).toMatchObject({ kind: "instructor", subject: "23CSPC302" });
    expect(classify("wen is my nxt class", C, T)).toMatchObject({ kind: "next_class" });
  });
  it("gibberish is help, off-topic is declined", () => {
    expect(classify("qwrtzp", C, T)).toMatchObject({ kind: "help" });
    expect(ask("tell me a joke", D, T).text).toBe("I can only help with your classes, attendance, deadlines and events.");
  });
  it("only the exact command rules navigate", () => {
    expect(ask("open planner", D, T).navigate).toBe("/planner");
    expect(ask("planner", D, T).navigate).toBeUndefined();
  });
});

describe("times", () => {
  it("reads clock times", () => {
    expect(extractTime("what's at 2pm")).toBe(14 * 60);
    expect(extractTime("at 10:15")).toBe(10 * 60 + 15);
    expect(extractTime("am i free at 2:40")).toBe(14 * 60 + 40);
    expect(extractTime("12 am")).toBe(0);
    expect(extractTime("no time here")).toBeUndefined();
  });
});

describe("new answers", () => {
  const data = {
    ...D,
    timetable: [
      ...D.timetable,
      { date: "2026-11-13", start: "12:50", end: "14:40", courseCode: "23CSPC305", kind: "LAB", room: "LB-A003", cancelled: false, extra: false },
      { date: "2026-11-13", start: "14:40", end: "15:35", courseCode: "23CSPC302", kind: "THEORY", room: null, cancelled: true, extra: false },
    ],
    instructors: { "23CSPC302": "Dr. Sumalatha" }, advisor: "Ms. Suma K",
    deadlines: [{ id: "q", courseCode: "23CSPC302", title: "DBMS quiz 2", due: "2026-11-16", kind: "quiz" as const }],
    events: [
      ...D.events,
      { id: "h", title: "Christmas", start: "2026-12-25", end: "2026-12-25", category: "HOLIDAY", isHoliday: true, cancelled: false },
      { id: "x", title: "CIE Test-2", start: "2026-12-21", end: "2026-12-23", category: "ACADEMIC DEADLINE", isHoliday: false, cancelled: false },
    ],
  };
  it("instructor and class advisor", () => {
    expect(ask("who teaches dbms", data, T).text).toBe("DBMS is taught by Dr. Sumalatha.");
    expect(ask("who is our class advisor", data, T).text).toBe("Your class advisor is Ms. Suma K.");
  });
  it("a day's classes, and what's on at a time", () => {
    const day = ask("what classes do i have tomorrow", data, T).text;
    expect(day).toContain("• 12:50–14:40 Computer Networks Laboratory, LB-A003");
    expect(day).toContain("(cancelled)");
    expect(ask("what is there at 1pm tomorrow", data, T).text).toBe("Fri 13 Nov 13:00: Computer Networks Laboratory, 12:50–14:40, LB-A003.");
  });
  it("free time skips cancelled classes", () => {
    expect(ask("when am i free tomorrow", data, T).text).toBe("Fri 13 Nov: free 11:10–12:50 and after 14:40.");
  });
  it("room of a lab", () => {
    expect(ask("where is cn lab", data, T).text).toBe("Computer Networks Laboratory on Fri 13 Nov at 12:50 is in LB-A003.");
  });
  it("deadlines, holidays and exams", () => {
    expect(ask("any assignments due", data, T).text).toBe("• Mon 16 Nov: DBMS quiz 2 (quiz)");
    expect(ask("is christmas a holiday", data, T).text).toContain("Christmas (holiday)");
    expect(ask("when is cie 2", data, T).text).toBe("• Mon 21 Dec – Wed 23 Dec: CIE Test-2");
  });
  it("projection only when asked", () => {
    expect(ask("how many classes are left in fsd", data, T).text).toBe("FSD: 16 classes left; attend them all and you finish at 94.4%; you can miss 7 of them and stay at 75%.");
    expect(ask("how many fsd classes can i skip", data, T).text).not.toContain("left");
  });
});

describe("exam questions name the right exam", () => {
  const events = [
    { id: "1", title: "CIE Test-2", start: "2026-12-21", end: "2026-12-23", category: "ACADEMIC DEADLINE", isHoliday: false, cancelled: false },
    { id: "6", title: "GCIE-2", start: "2026-12-28", end: "2026-12-28", category: "ACADEMIC DEADLINE", isHoliday: false, cancelled: false },
    { id: "2", title: "Laboratory Test", start: "2026-12-24", end: "2026-12-29", category: "ACADEMIC DEADLINE", isHoliday: false, cancelled: false },
    { id: "3", title: "Theory Examination", start: "2027-01-07", end: "2027-01-23", category: "EXAMINATION", isHoliday: false, cancelled: false },
    { id: "4", title: "Practical Examination", start: "2027-01-25", end: "2027-02-01", category: "EXAMINATION", isHoliday: false, cancelled: false },
    { id: "5", title: "Make-up Examination", start: "2027-02-18", end: "2027-02-25", category: "EXAMINATION", isHoliday: false, cancelled: false },
  ];
  const a = (q: string) => ask(q, { ...D, events }, T).text;
  it("matches the exam asked about", () => {
    expect(a("when is cie 2")).toBe("• Mon 21 Dec – Wed 23 Dec: CIE Test-2");
    expect(a("when are the semester exams")).toBe("• Thu 7 Jan – Sat 23 Jan: Theory Examination");
    expect(a("lab test dates")).toContain("Laboratory Test");
    expect(a("when is the make up exam")).toBe("• Thu 18 Feb – Thu 25 Feb: Make-up Examination");
    expect(a("when are the exams").split("\n").length).toBe(4);
  });
});

it("a room question for a day without that class says which day", () => {
  expect(ask("where is fsd on saturday", D, T).text).toBe("No FSD classes on Sat 14 Nov.");
});
