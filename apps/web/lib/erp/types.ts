// Shapes returned by erp.mite.ac.in /academics-api/query/* (only the fields we use).
export type ApiLog = { logId: number; sessionDate: string; startTime: string; endTime: string; attendanceStatus: "PRESENT" | "ABSENT"; attendanceEligible: boolean; isSwappedAway: boolean };
export type ApiCourse = { courseCode: string; courseName: string; presentCount: number; totalEligible: number; logs: ApiLog[] };
export type ApiTimetableEntry = {
  entryId: number; sessionDate: string; startTime: string; endTime: string;
  course: { courseCode: string; courseTitle: string } | null; room: { roomCode: string | null } | null;
  group: { groupCode: string } | null; logType: string[] | null; isCancelled: boolean;
};
export type ApiEvent = { event_id: number; event_title: string; start_date: string; end_date: string; is_holiday: boolean; is_class_suspended?: boolean; category_name: string; event_code: string | null };
export type ErpRaw = {
  student: { studentId: string; usn: string; name: string; section: string };
  courses: ApiCourse[];
  timetable: ApiTimetableEntry[];
  events: ApiEvent[];
};
