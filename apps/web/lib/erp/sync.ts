import { decrypt, type Sealed } from "@/lib/crypto";
import { ErpAuthError, erpLogin, fetchErp } from "./client";
import { mapErp } from "./map";
import type { ErpRaw } from "./types";
import { loadSnapshot } from "./snapshot";
import { todayIST, type TemplateSlot } from "@classpilot/core";

export type SyncStore = {
  getCreds(userId: string): Promise<(Sealed & { usn: string }) | null>;
  upsert(table: string, rows: Record<string, unknown>[], onConflict: string, opts?: { ignoreDuplicates?: boolean }): Promise<void>;
  setStatus(userId: string, s: { ok: boolean; error?: string }): Promise<void>;
  deleteFutureTimetable(userId: string, fromDate: string): Promise<void>;
  getTemplate?(section: string): Promise<TemplateSlot[]>;
};
export type SyncResult =
  | { ok: true; counts: Record<string, number> }
  | { ok: false; error: "ERP_AUTH" | "ERP_DOWN" | "NO_CREDS"; message: string };

export const syncUser = async (
  userId: string, store: SyncStore,
  opts: { snapshot?: boolean; login?: typeof erpLogin; today?: string; creds?: { usn: string; password: string }; raw?: ErpRaw } = {},
): Promise<SyncResult> => {
  const today = opts.today ?? todayIST();
  let raw: ErpRaw;
  if (opts.raw) raw = opts.raw; // already fetched (ERP sign-in): don't log in twice
  else if (opts.snapshot) raw = loadSnapshot();
  else {
    // New credentials are tried first; the caller stores them only if this succeeds.
    const stored = opts.creds ? null : await store.getCreds(userId);
    const creds = opts.creds ?? (stored ? { usn: stored.usn, password: decrypt(stored) } : null);
    if (!creds) return { ok: false, error: "NO_CREDS", message: "Add your ERP USN and password in Settings first." };
    try {
      const token = await (opts.login ?? erpLogin)(creds.usn, creds.password);
      raw = await fetchErp(token);
    } catch (e) {
      const auth = e instanceof ErpAuthError;
      const message = auth ? "The ERP rejected your USN/password." : `Couldn't reach the ERP: ${(e as Error).message}`;
      if (!opts.creds) await store.setStatus(userId, { ok: false, error: message });
      return { ok: false, error: auth ? "ERP_AUTH" : "ERP_DOWN", message };
    }
  }
  const template = (await store.getTemplate?.(raw.student.section)) ?? [];
  const m = mapErp(raw, today, template);
  // Upserts only: a failed or partial sync never deletes existing data.
  // Insert-only: curated titles (from the timetable sheet) are never overwritten by the ERP's names.
  await store.upsert("courses", m.courses.map((c) => ({ code: c.code, name: c.name })), "code", { ignoreDuplicates: true });
  await store.upsert("attendance_logs", m.logs.map((l) => ({ user_id: userId, erp_log_id: l.erpLogId, course_code: l.courseCode, date: l.date, start: l.start, end: l.end, status: l.status })), "user_id,erp_log_id");
  // The fetch succeeded, so it is safe to drop projected future rows that may have moved.
  await store.deleteFutureTimetable(userId, today);
  await store.upsert("timetable", m.timetable.map((t) => ({ user_id: userId, date: t.date, start: t.start, end: t.end, course_code: t.courseCode, kind: t.kind, room: t.room, section: t.section, cancelled: t.cancelled, erp_entry_id: t.erpEntryId })), "user_id,date,start");
  await store.upsert("events", m.events.map((e) => ({ title: e.title, start_date: e.start, end_date: e.end, category: e.category, is_holiday: e.isHoliday, source: "erp", erp_event_id: e.erpEventId })), "erp_event_id");
  await store.upsert("course_stats", m.stats.map((s) => ({ user_id: userId, course_code: s.code, present: s.present, held: s.held, planned_total: s.plannedTotal })), "user_id,course_code");
  await store.setStatus(userId, { ok: true });
  return { ok: true, counts: { courses: m.courses.length, logs: m.logs.length, timetable: m.timetable.length, events: m.events.length } };
};
