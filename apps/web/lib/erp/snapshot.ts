import snap from "@/fixtures/erp-snapshot.json";
import type { ErpRaw } from "./types";

type Snap = {
  student: ErpRaw["student"];
  courses: [string, string, number, number, string][];
  timetableToday: [string, string, string, string | null, string, string | null, boolean, number][];
  calendar: [number, string, string, string, boolean, string, string | null][];
};

/** Expand the compact, anonymised fixture into the real ERP API shapes. */
export const loadSnapshot = (): ErpRaw => {
  const s = snap as unknown as Snap;
  return {
    student: s.student,
    courses: s.courses.map(([courseCode, courseName, presentCount, totalEligible, logs]) => ({
      courseCode, courseName, presentCount, totalEligible,
      logs: logs.split(";").map((l) => {
        const [id, date, st, en, ps] = l.split(" ");
        return { logId: +id, sessionDate: date, startTime: st, endTime: en, attendanceStatus: ps === "P" ? "PRESENT" : "ABSENT", attendanceEligible: true, isSwappedAway: false } as const;
      }),
    })),
    timetable: s.timetableToday.map(([date, st, en, code, kind, room, cancelled, entryId]) => ({
      entryId, sessionDate: date, startTime: st, endTime: en,
      course: code ? { courseCode: code, courseTitle: s.courses.find((c) => c[0] === code)?.[1] ?? code } : null,
      room: { roomCode: room }, group: { groupCode: s.student.section }, logType: [kind], isCancelled: cancelled,
    })),
    events: s.calendar.map(([event_id, event_title, start_date, end_date, is_holiday, category_name, event_code]) =>
      ({ event_id, event_title, start_date, end_date, is_holiday, category_name, event_code })),
  };
};
