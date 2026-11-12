import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { adminSyncStore, supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { syncUser } from "@/lib/erp/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED", message: "Log in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { usn?: string; password?: string };
  const admin = supabaseAdmin();
  if (body.usn && body.password) {
    const sealed = encrypt(body.password);
    const { error } = await admin.from("erp_credentials").upsert({ user_id: user.id, usn: body.usn.trim().toUpperCase(), ...sealed });
    if (error) return NextResponse.json({ ok: false, error: "DB", message: error.message }, { status: 500 });
    await admin.from("profiles").update({ usn: body.usn.trim().toUpperCase() }).eq("id", user.id);
  }
  const { data: creds } = await admin.from("erp_credentials").select("user_id").eq("user_id", user.id).maybeSingle();
  const snapshot = process.env.DEMO_SNAPSHOT === "1" && !creds;
  try {
    const r = await syncUser(user.id, adminSyncStore(), { snapshot });
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "DB", message: (e as Error).message }, { status: 500 });
  }
}
