import { describe, it, expect, vi } from "vitest";
import { erpEmail, erpSignIn, rateLimited, type SignInDeps } from "@/lib/erp/signin";
import { ErpAuthError, ErpDownError } from "@/lib/erp/client";
import type { ErpRaw } from "@/lib/erp/types";

const raw = (usn = "4MT23CS001"): ErpRaw => ({ student: { studentId: "s1", usn, name: "Asha Rao", section: "5CS3" }, courses: [], timetable: [], events: [] });

/** Fake ERP + database. `existing` maps USN → user id for students who signed in before. */
const fakes = (o: { login?: SignInDeps["login"]; existing?: Record<string, string> } = {}) => {
  const d = {
    login: vi.fn(o.login ?? (async () => "token")),
    fetch: vi.fn(async () => raw()),
    findUserByUsn: vi.fn(async (usn: string) => o.existing?.[usn] ?? null),
    createUser: vi.fn(async () => "new-user"),
    saveProfile: vi.fn(async () => {}),
    saveCreds: vi.fn(async () => {}),
    sync: vi.fn(async () => ({ ok: true })),
    emailOf: vi.fn(async () => "4mt23cs001@erp.classpilot"),
    startSession: vi.fn(async () => {}),
  } satisfies SignInDeps;
  return d;
};
let n = 0;
const user = () => `4MT23CS${String(100 + n++)}`; // a fresh USN per test so the attempt limit never carries over

describe("ERP sign-in", () => {
  it("first login: the ERP checks the password, then the account is created, credentials saved, data synced, session started", async () => {
    const d = fakes();
    expect(await erpSignIn(` ${user()} `, "erp-pass", d)).toEqual({ ok: true, created: true });
    expect(d.createUser).toHaveBeenCalledWith("4mt23cs001@erp.classpilot", "Asha Rao");
    expect(d.saveProfile).toHaveBeenCalledWith("new-user", { name: "Asha Rao", usn: "4MT23CS001", section: "5CS3" });
    expect(d.saveCreds).toHaveBeenCalledWith("new-user", "4MT23CS001", "erp-pass");
    expect(d.sync).toHaveBeenCalledWith("new-user", raw());
    expect(d.startSession).toHaveBeenCalledWith("4mt23cs001@erp.classpilot");
  });
  it("the next login reuses the same account (found by the USN the ERP returns, not what was typed)", async () => {
    const d = fakes({ existing: { "4MT23CS001": "u-1" } });
    expect(await erpSignIn("asha@mite.ac.in", "erp-pass", d)).toEqual({ ok: true, created: false });
    expect(d.findUserByUsn).toHaveBeenCalledWith("4MT23CS001");
    expect(d.createUser).not.toHaveBeenCalled();
    expect(d.saveCreds).toHaveBeenCalledWith("u-1", "4MT23CS001", "erp-pass");
  });
  it("a wrong password signs nobody in and stores nothing", async () => {
    const d = fakes({ login: async () => { throw new ErpAuthError("bad"); } });
    expect(await erpSignIn(user(), "wrong", d)).toEqual({ ok: false, error: "The ERP didn't accept that USN and password." });
    for (const f of [d.createUser, d.saveCreds, d.sync, d.startSession]) expect(f).not.toHaveBeenCalled();
  });
  it("the ERP being down is reported as such", async () => {
    const d = fakes({ login: async () => { throw new ErpDownError("timeout"); } });
    expect(await erpSignIn(user(), "p", d)).toMatchObject({ ok: false, error: expect.stringContaining("Couldn't reach the MITE ERP") });
    expect(d.startSession).not.toHaveBeenCalled();
  });
  it("a failed data sync still signs the student in (Settings can retry)", async () => {
    const d = fakes();
    d.sync.mockResolvedValueOnce({ ok: false });
    expect(await erpSignIn(user(), "p", d)).toMatchObject({ ok: true });
    expect(d.startSession).toHaveBeenCalled();
  });
  it("rejects bad input before contacting the ERP", async () => {
    const d = fakes();
    for (const [u, p] of [["", "x"], ["ab", "x"], ["4MT23CS001", ""], ["4MT 23", "x"], ["a%b_c", "x"], ["4MT23CS001", "x".repeat(201)]])
      expect((await erpSignIn(u, p, d)).ok).toBe(false);
    expect(d.login).not.toHaveBeenCalled();
  });
  it("limits attempts per USN to five in five minutes", async () => {
    const u = user(), t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimited(u, t + i)).toBe(false);
    expect(rateLimited(u, t + 10)).toBe(true);
    expect(rateLimited(u, t + 5 * 60_000 + 20)).toBe(false);
  });
  it("ClassPilot's address for a student is derived from the USN and never a real mailbox", () => {
    expect(erpEmail("4MT23CS001")).toBe("4mt23cs001@erp.classpilot");
  });
});

describe("ERP sign-in for the mobile app", () => {
  it("returns the session tokens when the session is handed over as tokens", async () => {
    const d = fakes();
    d.startSession.mockResolvedValueOnce({ access_token: "a", refresh_token: "r" } as never);
    expect(await erpSignIn(user(), "p", d)).toEqual({ ok: true, created: true, session: { access_token: "a", refresh_token: "r" } });
  });
  it("a wrong password returns no tokens", async () => {
    const d = fakes({ login: async () => { throw new ErpAuthError("bad"); } });
    expect(await erpSignIn(user(), "p", d)).not.toHaveProperty("session");
    expect(d.startSession).not.toHaveBeenCalled();
  });
});
