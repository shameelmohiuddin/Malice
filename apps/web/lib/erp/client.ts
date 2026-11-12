import { todayIST } from "@bunk/core";
import type { ApiCourse, ApiEvent, ApiTimetableEntry, ErpRaw } from "./types";

const BASE = "https://erp.mite.ac.in";
const TOKEN_URL = `${BASE}/auth/realms/mite/protocol/openid-connect/token`;
const API = `${BASE}/academics-api/query`;

export class ErpAuthError extends Error {}
export class ErpDownError extends Error {}

/** Keycloak direct grant first; if the realm forbids it, fall back to a headless browser login. */
export const erpLogin = async (usn: string, password: string): Promise<string> => {
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "password", client_id: "admissions-ui", scope: "openid", username: usn, password }),
    });
  } catch (e) { throw new ErpDownError(String(e)); }
  if (res.ok) return (await res.json()).access_token as string;
  const body = await res.json().catch(() => ({}));
  if (body.error === "invalid_grant" && /invalid user credentials/i.test(body.error_description ?? "")) throw new ErpAuthError("Wrong USN or password");
  if (res.status >= 500) throw new ErpDownError(`ERP returned ${res.status}`);
  return browserLogin(usn, password);
};

const browserLogin = async (usn: string, password: string): Promise<string> => {
  let pw: typeof import("playwright");
  try { pw = await import("playwright"); } catch { throw new ErpDownError("Direct login is disabled on the ERP and the browser fallback isn't installed"); }
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    const token = new Promise<string>((resolve) => page.on("request", (r) => {
      const a = r.headers()["authorization"];
      if (r.url().includes("/academics-api/") && a?.startsWith("Bearer ")) resolve(a.slice(7));
    }));
    await page.goto(`${BASE}/student/dashboard`);
    await page.fill("#username", usn);
    await page.fill("#password", password);
    await page.click("#kc-login");
    const t = await Promise.race([token, new Promise<null>((r) => setTimeout(() => r(null), 20_000))]);
    if (!t) throw new ErpAuthError("Login failed (check USN/password)");
    return t;
  } finally { await browser.close(); }
};

const get = async <T>(token: string, path: string): Promise<T> => {
  const r = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (r.status === 401 || r.status === 403) throw new ErpAuthError("ERP session rejected");
  if (!r.ok) throw new ErpDownError(`ERP ${path} → ${r.status}`);
  return ((await r.json()) as { data: T }).data;
};

export const fetchErp = async (token: string, section = "5CS3"): Promise<ErpRaw> => {
  const me = await get<{ studentId?: string; id?: string; usn?: string; name?: string; studentName?: string }>(token, "/profile/me");
  const studentId = me.studentId ?? me.id ?? "";
  const terms = await get<{ academicTermId: number; isCurrent: boolean; academicYearId: number; termMasterId: number }[]>(token, `/students/semesters?student_id=${studentId}`);
  const term = terms.find((t) => t.isCurrent) ?? terms[terms.length - 1];
  const cal = await get<{ months: { events: ApiEvent[] }[] }>(token, `/portal/calendar?academic_year_id=${term.academicYearId}&term_master_id=${term.termMasterId}`);
  const events = cal.months.flatMap((m) => m.events);
  const start = events.find((e) => e.event_code === "CLASS_START")?.start_date ?? "2026-01-01";
  const end = events.find((e) => e.event_code === "CLASS_END")?.start_date ?? todayIST();
  const today = todayIST();
  const att = await get<{ courses: ApiCourse[] }[]>(token, `/attendance/session-logs/attendance?student_id=${studentId}&academic_term_id=${term.academicTermId}&from_date=${start}&to_date=${today}`);
  const timetable = await get<ApiTimetableEntry[]>(token, `/faculty/timetable?studentUUID=${studentId}&from_date=${today}&to_date=${end}`);
  return {
    student: { studentId, usn: me.usn ?? "", name: me.name ?? me.studentName ?? "", section: timetable.find((t) => t.group?.groupCode)?.group.groupCode ?? section },
    courses: att[0]?.courses ?? [], timetable, events,
  };
};
