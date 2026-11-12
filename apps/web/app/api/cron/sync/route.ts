import { NextResponse } from "next/server";
import { syncCooldownLeft } from "@classpilot/core";
import { adminSyncStore, supabaseAdmin } from "@/lib/supabase/admin";
import { syncUser } from "@/lib/erp/sync";

export const runtime = "nodejs";
export const maxDuration = 300;
const MIN_INTERVAL_SEC = 30 * 60;

/**
 * Auto-sync every connected student. Call with `Authorization: Bearer $CRON_SECRET`
 * (e.g. a cron job: curl -H "Authorization: Bearer …" https://host/api/cron/sync every 30 min).
 * Sequential on purpose: one ERP login at a time.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const { data: users, error } = await supabaseAdmin().from("erp_credentials").select("user_id,last_sync");
  if (error) return NextResponse.json({ ok: false, error: "SERVER", message: error.message }, { status: 500 });
  const results: Record<string, string> = {};
  const now = new Date();
  for (const u of users ?? []) {
    if (syncCooldownLeft(u.last_sync, now, MIN_INTERVAL_SEC) > 0) { results[u.user_id] = "skipped (recent)"; continue; }
    try { const r = await syncUser(u.user_id, adminSyncStore()); results[u.user_id] = r.ok ? "ok" : r.error; }
    catch (e) { results[u.user_id] = `error: ${(e as Error).message}`; }
  }
  return NextResponse.json({ ok: true, results });
}
