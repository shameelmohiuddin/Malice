"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const DEMO: Record<string, string> = { student: "student1@demo.bunk", student2: "student2@demo.bunk", teacher: "teacher@demo.bunk", admin: "admin@demo.bunk" };

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
