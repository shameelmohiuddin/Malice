"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { erpSignIn } from "@/lib/erp/signin";
import { oneTimeToken, signInDeps } from "@/lib/erp/signin-deps";

const DEMO: Record<string, string> = { student: "student1@demo.classpilot", student2: "student2@demo.classpilot", teacher: "teacher@demo.classpilot", admin: "admin@demo.classpilot" };

export type AuthState = { error?: string; info?: string } | null;
export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({ email: String(form.get("email")), password: String(form.get("password")), options: { data: { name: String(form.get("name") ?? "") } } });
  if (error) return { error: error.message };
  return { info: "Account created. Check your email if confirmation is on, then log in." };
}

export async function demoLogin(who: string) {
  if (process.env.NEXT_PUBLIC_DEMO !== "1" || !DEMO[who]) return;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: DEMO[who], password: process.env.DEMO_PASSWORD! });
  if (error) throw new Error(`Demo login failed: ${error.message}. Run the seed script.`);
  redirect("/");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Log in with MITE ERP credentials (USN or college email + ERP password). See lib/erp/signin.ts. */
export async function erpSignInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const deps = signInDeps(async (email) => {
    // Web: a one-time server-side token becomes the session cookie.
    const supabase = await supabaseServer();
    const v = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: await oneTimeToken(email) });
    if (v.error) throw new Error(v.error.message);
  });
  let r;
  try {
    r = await erpSignIn(String(form.get("username") ?? ""), String(form.get("password") ?? ""), deps);
  } catch (e) {
    console.error("ERP sign-in failed", e);
    return { error: "Something went wrong signing you in. Try again." };
  }
  if (!r.ok) return { error: r.error };
  redirect("/");
}
