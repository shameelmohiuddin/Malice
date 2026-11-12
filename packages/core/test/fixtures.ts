import type { CourseStats, TimetableSlot } from "../src/types";
import type { AssistantData } from "../src/assistant/answer";

export const C = [
  { code: "23CSPE311", name: "Full Stack Development" },
  { code: "23MEOE313", name: "Product Development" },
  { code: "23CSPC304", name: "Formal language and automata theory" },
  { code: "23CSPC303", name: "Computer Networks" },
  { code: "23CSPC302", name: "Database Management Systems" },
  { code: "23CSPC305", name: "Computer Networks Laboratory" },
  { code: "23HMCC301", name: "Entrepreneurship" },
];
export const T = "2026-11-12";

const counts: Record<string, [number, number]> = {
  "23CSPE311": [18, 20], "23MEOE313": [23, 24], "23CSPC304": [23, 25], "23CSPC303": [20, 23],
  "23CSPC302": [25, 26], "23CSPC305": [17, 17], "23HMCC301": [11, 14],
};
export const stats: CourseStats[] = C.map((c) => ({ ...c, present: counts[c.code][0], held: counts[c.code][1], plannedTotal: counts[c.code][1] + 16 }));

const slot = (date: string, start: string, end: string, courseCode: string | null, kind = "THEORY"): TimetableSlot =>
  ({ date, start, end, courseCode, kind, room: null, cancelled: false, extra: false });

export const timetable: TimetableSlot[] = [
  slot("2026-11-13", "09:00", "09:55", "23HMCC301"),
  slot("2026-11-13", "10:15", "11:10", "23CSPE311"),
  slot("2026-11-13", "12:05", "12:50", null, "LUNCH"),
];

export const D: AssistantData = {
  stats, timetable, events: [
    { id: "e1", title: "PTM-1", start: "2026-11-14", end: "2026-11-14", category: "ACADEMIC DEADLINE", isHoliday: false, cancelled: false },
  ],
  deadlines: [], classroom: { "23CSPE311": "https://classroom.google.com/c/abc" },
  min: 0.75, // these fixtures were written for a 75% minimum; the 85%/75% rule has its own tests
};
