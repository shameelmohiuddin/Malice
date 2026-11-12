import { decrypt, type Sealed } from "@/lib/crypto";
import { ErpAuthError, erpLogin, fetchErp } from "./client";
import { mapErp } from "./map";
import { loadSnapshot } from "./snapshot";
import { todayIST } from "@bunk/core";

export type SyncStore = {
  getCreds(userId: string): Promise<(Sealed & { usn: string }) | null>;
  upsert(table: string, rows: Record<string, unknown>[], onConflict: string): Promise<void>;
  setStatus(userId: string, s: { ok: boolean; error?: string }): Promise<void>;
};
export type SyncResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false; error: "ERP_AUTH" | "ERP_DOWN" | "NO_CREDS"; message: string };

export const syncUser = async (
  userId: string, store: SyncStore,
  opts: { snapshot?: boolean; login?: typeof erpLogin; today?: string } = {},
): Promise<SyncResult> => {
  const today = opts.today ?? todayIST();
  let raw;
  if (opts.snapshot) raw = loadSnapshot();
  else {
    const creds = await store.getCreds(userId);
    if (!creds) return { ok: false, error: "NO_CREDS", message: "Add your ERP USN and password in Settings first." };
    try {
      const token = await (opts.login ?? erpLogin)(creds.usn, decrypt(creds));
      raw = await fetchErp(token);
    } catch (e) {
      const auth = e instanceof ErpAuthError;
      const message = auth ? "The ERP rejected your USN/password." : `Couldn't reach the ERP: ${(e as Error).message}`;
      await store.setStatus(userId, { ok: false, error: message });
      return { ok: false, error: auth ? "ERP_AUTH" : "ERP_DOWN", message };
    }
  }
  const m = mapErp(raw, today);
  // Upserts only: a failed or partial sync never deletes existing data.
  await store.upsert("courses", m.courses.map((c) => ({ code: c.code, name: c.name })), "code");
  await store.upsert("attendance_logs", m.logs.map((l) => ({ user_id: userId, erp_log_id: l.erpLogId, course_code: l.courseCode, date: l.date, start: l.start, end: l.end, status: l.status })), "user_id,erp_log_id");
  await store.upsert("timetable", m.timetable.map((t) => ({ user_id: userId, date: t.date, start: t.start, end: t.end, course_code: t.courseCode, kind: t.kind, room: t.room, section: t.section, cancelled: t.cancelled, erp_entry_id: t.erpEntryId })), "user_id,date,start");
  await store.upsert("events", m.events.map((e) => ({ title: e.title, start_date: e.start, end_date: e.end, category: e.category, is_holiday: e.isHoliday, source: "erp", erp_event_id: e.erpEventId })), "erp_event_id");
  await store.upsert("course_stats", m.stats.map((s) => ({ user_id: userId, course_code: s.code, present: s.present, held: s.held, planned_total: s.plannedTotal })), "user_id,course_code");
  await store.setStatus(userId, { ok: true });
  return { ok: true, counts: { courses: m.courses.length, logs: m.logs.length, timetable: m.timetable.length, events: m.events.length } };
};
