import { it, expect, vi, beforeAll } from "vitest";
import { syncUser, type SyncStore } from "@/lib/erp/sync";
import { ErpAuthError } from "@/lib/erp/client";
import { encrypt } from "@/lib/crypto";

beforeAll(() => { process.env.ERP_ENC_KEY = Buffer.alloc(32, 7).toString("base64"); });

const store = (creds: boolean): SyncStore => ({
  getCreds: vi.fn(async () => (creds ? { usn: "4MT24CS000", ...encrypt("pw") } : null)),
  upsert: vi.fn(async () => {}),
  setStatus: vi.fn(async () => {}),
  deleteFutureTimetable: vi.fn(async () => {}),
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

it("new credentials are tried before anything is stored", async () => {
  const s = store(true);
  const r = await syncUser("u1", s, { creds: { usn: "X", password: "typo" }, login: async () => { throw new ErpAuthError("bad"); }, today: "2026-11-12" });
  expect(r).toMatchObject({ ok: false, error: "ERP_AUTH" });
  expect(s.getCreds).not.toHaveBeenCalled();
});
it("successful sync clears future timetable before re-inserting it", async () => {
  const s = { ...store(false), deleteFutureTimetable: vi.fn(async () => {}) };
  await syncUser("u1", s, { snapshot: true, today: "2026-11-12" });
  expect(s.deleteFutureTimetable).toHaveBeenCalledWith("u1", "2026-11-12");
  const order = [(s.deleteFutureTimetable as any).mock.invocationCallOrder[0], ...(s.upsert as any).mock.calls.map((_: any, i: number) => (s.upsert as any).mock.invocationCallOrder[i])];
  expect(order[0]).toBeLessThan(Math.max(...order.slice(1)));
});

it("sync never overwrites existing course titles", async () => {
  const s = store(false);
  await syncUser("u1", s, { snapshot: true, today: "2026-11-12" });
  const call = (s.upsert as any).mock.calls.find((c: any[]) => c[0] === "courses");
  expect(call[3]).toEqual({ ignoreDuplicates: true });
});
