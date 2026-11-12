import { it, expect, vi, afterEach } from "vitest";
import { erpLogin, ErpAuthError } from "@/lib/erp/client";
afterEach(() => vi.unstubAllGlobals());

it("any invalid_grant except 'not allowed' is an auth error", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant", error_description: "Account temporarily disabled" }), { status: 400 })));
  await expect(erpLogin("u", "p")).rejects.toBeInstanceOf(ErpAuthError);
});
