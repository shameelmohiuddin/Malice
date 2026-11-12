export type Status = "PRESENT" | "ABSENT";
export type Advice = "safe" | "risky" | "must";

export type CourseStats = { code: string; name: string; present: number; held: number; plannedTotal: number };

export type TimetableSlot = {
  date: string; start: string; end: string;
  courseCode: string | null; kind: string; room: string | null;
  cancelled: boolean; extra: boolean;
};

export type Deadline = {
  id: string; courseCode: string | null; title: string;
  due: string; kind: "exam" | "quiz" | "assignment";
};

export type CalendarEvent = {
  id: string; title: string; start: string; end: string;
  category: string; isHoliday: boolean; cancelled: boolean;
};

export type StudyBlock = { date: string; start: string; end: string; deadlineId: string; title: string };

export type ScheduleOverride = {
  id: string; courseCode: string; date: string; start: string; end: string;
  action: "cancel" | "extra"; room: string | null;
};
