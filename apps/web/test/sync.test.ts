import { it, expect, vi, beforeAll } from "vitest";
import { syncUser, type SyncStore } from "@/lib/erp/sync";
import { ErpAuthError } from "@/lib/erp/client";
import { encrypt } from "@/lib/crypto";

beforeAll(() => { process.env.ERP_ENC_KEY = Buffer.alloc(32, 7).toString("base64"); });

const store = (creds: boolean): SyncStore => ({
  getCreds: vi.fn(async () => (creds ? { usn: "4MT24CS000", ...encrypt("pw") } : null)),
  upsert: vi.fn(async () => {}),
  setStatus: vi.fn(async () => {}),
});

it("wrong password keeps old data", async () => {
  const s = store(true);
  const r = await syncUser("u1", s, { login: async () => { throw new ErpAuthError("bad"); }, today: "2026-11-12" });
  expect(r).toMatchObject({ ok: false, error: "ERP_AUTH" });
  expect(s.upsert).not.toHaveBeenCalled();
  expect(s.setStatus).toHaveBeenCalledWith("u1", expect.objectContaining({ error: expect.any(String) }));
});
it("no creds", async () => {
  expect(await syncUser("u1", store(false), { today: "2026-11-12" })).toMatchObject({ ok: false, error: "NO_CREDS" });
});
it("snapshot mode upserts everything", async () => {
  const s = store(false);
  const r = await syncUser("u1", s, { snapshot: true, today: "2026-11-12" });
  expect(r).toMatchObject({ ok: true });
  const tables = (s.upsert as any).mock.calls.map((c: any[]) => c[0]);
  expect(tables).toEqual(expect.arrayContaining(["courses", "attendance_logs", "timetable", "events"]));
});
