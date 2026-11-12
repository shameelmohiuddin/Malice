import { it, expect, vi, afterEach } from "vitest";
import { fetchErp } from "@/lib/erp/client";

afterEach(() => vi.unstubAllGlobals());

// Real /profile/me shape captured from erp.mite.ac.in (anonymised).
const PROFILE = { user_type: "STUDENT", student_id: "stu-uuid-1", usn_no: "4MT24CS000", full_name: "DEMO", group_name: "5CS3", academic_year_id: 12, academic_term_id: 181, term_master_id: 5 };

it("uses the snake_case profile fields for every follow-up call", async () => {
  const urls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(u);
    const body =
      u.includes("/profile/me") ? PROFILE :
      u.includes("/portal/calendar") ? { months: [{ events: [{ event_id: 1, event_title: "Commencement of Classes", start_date: "2026-09-07", end_date: "2026-09-07", is_holiday: false, category_name: "x", event_code: "CLASS_START" }] }] } :
      u.includes("/attendance/") ? [{ courses: [] }] :
      u.includes("/faculty/timetable") ? [{ entryId: 1, sessionDate: "2026-11-12", startTime: "09:00", endTime: "09:55", course: null, room: null, group: null, logType: null, isCancelled: false }] :
      null;
    return new Response(JSON.stringify({ success: true, data: body }), { status: body ? 200 : 400 });
  }));
  const raw = await fetchErp("tok");
  expect(raw.student).toEqual({ studentId: "stu-uuid-1", usn: "4MT24CS000", name: "DEMO", section: "5CS3" });
  expect(urls.some((u) => u.includes("student_id=stu-uuid-1&academic_term_id=181"))).toBe(true);
  expect(urls.some((u) => u.includes("studentUUID=stu-uuid-1"))).toBe(true);
  expect(urls.every((u) => !u.includes("student_id=&"))).toBe(true);
});
