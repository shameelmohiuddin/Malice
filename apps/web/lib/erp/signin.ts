import { ErpAuthError, ErpDownError, erpLogin, fetchErp } from "./client";
import type { ErpRaw } from "./types";

/** What the ERP sign-in needs from the outside world (injected so it can be tested without the ERP or Supabase). */
export type SignInDeps = {
  login: (username: string, password: string) => Promise<string>;
  fetch: (token: string) => Promise<ErpRaw>;
  findUserByUsn: (usn: string) => Promise<string | null>;
  createUser: (email: string, name: string) => Promise<string>;
  saveProfile: (userId: string, p: { name: string; usn: string; section: string }) => Promise<void>;
  saveCreds: (userId: string, usn: string, password: string) => Promise<void>;
  sync: (userId: string, raw: ErpRaw) => Promise<{ ok: boolean }>;
  emailOf: (userId: string) => Promise<string>;
  startSession: (email: string) => Promise<void>;
};
export type SignInResult = { ok: true; created: boolean } | { ok: false; error: string };

/** ClassPilot's own login address for an ERP student. Not a real mailbox: nothing is ever sent to it. */
export const erpEmail = (usn: string) => `${usn.toLowerCase()}@erp.classpilot`;

const USERNAME = /^[A-Za-z0-9@._-]{3,64}$/;
const WINDOW = 5 * 60_000, LIMIT = 5;
const attempts = new Map<string, number[]>();

/** Too many sign-in attempts for this USN in five minutes (protects the student's ERP account from guessing). */
export const rateLimited = (key: string, now = Date.now()) => {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW);
  attempts.set(key, [...recent, now]);
  return recent.length >= LIMIT;
};

/**
 * Sign in with MITE ERP credentials: the ERP checks the password, then ClassPilot finds or creates the student's account,
 * keeps the ERP password encrypted for later syncs, pulls their data and starts a session. ClassPilot stores no password of its own.
 */
export const erpSignIn = async (usernameRaw: string, password: string, deps: SignInDeps): Promise<SignInResult> => {
  const username = usernameRaw.trim();
  if (!USERNAME.test(username) || !password || password.length > 200) return { ok: false, error: "Enter your USN (or college email) and ERP password." };
  if (rateLimited(username.toLowerCase())) return { ok: false, error: "Too many attempts. Wait a few minutes and try again." };

  let raw: ErpRaw;
  try {
    raw = await deps.fetch(await deps.login(username, password));
  } catch (e) {
    if (e instanceof ErpAuthError) return { ok: false, error: "The ERP didn't accept that USN and password." };
    if (e instanceof ErpDownError) return { ok: false, error: "Couldn't reach the MITE ERP right now. Try again in a minute." };
    throw e;
  }
  const usn = (raw.student.usn || username).trim().toUpperCase();

  let userId = await deps.findUserByUsn(usn);
  const created = !userId;
  if (!userId) userId = await deps.createUser(erpEmail(usn), raw.student.name || usn);
  await deps.saveProfile(userId, { name: raw.student.name || usn, usn, section: raw.student.section });
  await deps.saveCreds(userId, usn, password);
  await deps.sync(userId, raw); // a failed sync still signs the student in; Settings shows the error and can retry
  await deps.startSession(await deps.emailOf(userId));
  return { ok: true, created };
};

export const realErpDeps = { login: erpLogin, fetch: (token: string) => fetchErp(token) };
