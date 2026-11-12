import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { adminSyncStore, supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { syncUser } from "@/lib/erp/sync";
import { syncCooldownLeft } from "@classpilot/core";

const COOLDOWN_SEC = 60;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED", message: "Log in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { usn?: string; password?: string };
  const admin = supabaseAdmin();
  const usn = body.usn?.trim();
  try {
    if (usn && body.password) {
      // Try the new credentials first; only store them once the ERP accepts them.
      const r = await syncUser(user.id, adminSyncStore(), { creds: { usn, password: body.password } });
      if (r.ok) {
        const { error } = await admin.from("erp_credentials").upsert({ user_id: user.id, usn, ...encrypt(body.password), last_sync: new Date().toISOString(), last_error: null });
        if (error) return NextResponse.json({ ok: false, error: "DB", message: error.message }, { status: 500 });
        await admin.from("profiles").update({ usn }).eq("id", user.id);
      }
      return NextResponse.json(r, { status: r.ok ? 200 : 400 });
    }
    const { data: creds } = await admin.from("erp_credentials").select("user_id,last_sync").eq("user_id", user.id).maybeSingle();
    const wait = syncCooldownLeft(creds?.last_sync ?? null, new Date(), COOLDOWN_SEC);
    if (creds && wait > 0) return NextResponse.json({ ok: false, error: "RATE_LIMITED", message: `Synced just now. Try again in ${wait}s.` }, { status: 429 });
    const r = await syncUser(user.id, adminSyncStore(), { snapshot: process.env.DEMO_SNAPSHOT === "1" && !creds });
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "DB", message: (e as Error).message }, { status: 500 });
  }
}
