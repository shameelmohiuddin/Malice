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
  const notAllowed = body.error === "unauthorized_client" || /not allowed|not enabled/i.test(body.error_description ?? "");
  if (body.error === "invalid_grant" && !notAllowed) throw new ErpAuthError(body.error_description || "Wrong USN or password");
  if (res.status >= 500) throw new ErpDownError(`ERP returned ${res.status}`);
  if (!notAllowed) throw new ErpAuthError(body.error_description || `ERP login failed (${res.status})`);
  return browserLogin(usn, password);
};

const browserLogin = async (usn: string, password: string): Promise<string> => {
  let pw: any;
  const mod = "playwright";
  try { pw = await import(/* webpackIgnore: true */ mod); } catch { throw new ErpDownError("Direct login is disabled on the ERP and the browser fallback isn't installed"); }
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage();
    const token = new Promise<string>((resolve) => page.on("request", (r: any) => {
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

type Profile = {
  student_id: string; usn_no: string; full_name: string; group_name: string | null;
  academic_year_id: number; academic_term_id: number; term_master_id: number;
};

export const fetchErp = async (token: string, section = "5CS3"): Promise<ErpRaw> => {
  const me = await get<Profile>(token, "/profile/me");
  if (!me?.student_id) throw new ErpDownError("ERP profile has no student_id (is this a student account?)");
  const cal = await get<{ months: { events: ApiEvent[] }[] }>(token, `/portal/calendar?academic_year_id=${me.academic_year_id}&term_master_id=${me.term_master_id}`);
  const events = cal.months.flatMap((m) => m.events);
  const today = todayIST();
  const start = events.find((e) => e.event_code === "CLASS_START")?.start_date ?? today;
  const end = events.find((e) => e.event_code === "CLASS_END")?.start_date ?? today;
  const att = await get<{ courses: ApiCourse[] }[]>(token, `/attendance/session-logs/attendance?student_id=${me.student_id}&academic_term_id=${me.academic_term_id}&from_date=${start}&to_date=${today}`);
  const timetable = await get<ApiTimetableEntry[]>(token, `/faculty/timetable?studentUUID=${me.student_id}&from_date=${today}&to_date=${end > today ? end : today}`);
  return {
    student: { studentId: me.student_id, usn: me.usn_no, name: me.full_name, section: me.group_name ?? section },
    courses: att?.[0]?.courses ?? [], timetable: timetable ?? [], events,
  };
};
