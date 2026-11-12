"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { adminSyncStore, supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { syncUser } from "@/lib/erp/sync";
import { erpSignIn, realErpDeps, type SignInDeps } from "@/lib/erp/signin";

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
  const admin = supabaseAdmin();
  const deps: SignInDeps = {
    ...realErpDeps,
    async findUserByUsn(usn) {
      const { data } = await admin.from("profiles").select("id").ilike("usn", usn.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1).maybeSingle(); // exact, case-insensitive
      return data?.id ?? null;
    },
    async createUser(email, name) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name } });
      if (data.user) return data.user.id;
      // The account exists but its profile lost the USN: find it by its ClassPilot address.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users.find((u) => u.email === email);
      if (!found) throw new Error(error?.message ?? "Could not create the account");
      return found.id;
    },
    async saveProfile(userId, p) {
      const { error } = await admin.from("profiles").update({ name: p.name, usn: p.usn, section: p.section }).eq("id", userId);
      if (error) throw new Error(error.message);
    },
    async saveCreds(userId, usn, password) {
      const { error } = await admin.from("erp_credentials").upsert({ user_id: userId, usn, ...encrypt(password), last_error: null });
      if (error) throw new Error(error.message);
    },
    sync: (userId, raw) => syncUser(userId, adminSyncStore(), { raw }),
    async emailOf(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (!data.user?.email) throw new Error(error?.message ?? "Account has no login address");
      return data.user.email;
    },
    async startSession(email) {
      // One-time server-side token: signs the student in without ClassPilot ever holding a password for them.
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Could not start a session");
      const supabase = await supabaseServer();
      const v = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
      if (v.error) throw new Error(v.error.message);
    },
  };
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
