import { NextResponse } from "next/server";
import { erpSignIn } from "@/lib/erp/signin";
import { signInDeps, tokenSession } from "@/lib/erp/signin-deps";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST { username, password } → { ok: true, data: { access_token, refresh_token } } for the mobile app.
 * Same flow as the web login: the ERP checks the password; nothing is stored if it is wrong.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  if (typeof b?.username !== "string" || typeof b?.password !== "string")
    return NextResponse.json({ ok: false, error: "INVALID", message: "Enter your USN (or college email) and ERP password." }, { status: 400 });
  try {
    const r = await erpSignIn(b.username, b.password, signInDeps(tokenSession));
    if (!r.ok) return NextResponse.json({ ok: false, error: "ERP_AUTH", message: r.error }, { status: 401 });
    if (!r.session) throw new Error("No session");
    return NextResponse.json({ ok: true, data: r.session });
  } catch (e) {
    console.error("Mobile ERP sign-in failed", e);
    return NextResponse.json({ ok: false, error: "SERVER", message: "Something went wrong signing you in. Try again." }, { status: 500 });
  }
}
