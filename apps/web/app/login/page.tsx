"use client";
import { useActionState, useState } from "react";
import { demoLogin, signIn, signUp, type AuthState } from "./actions";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action, pending] = useActionState(mode === "in" ? signIn : signUp, null as AuthState);
  const demo = process.env.NEXT_PUBLIC_DEMO === "1";
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Class<span className="text-accent">Pilot</span></h1>
          <p className="text-muted mt-1">Know exactly when you can skip, and when you can't.</p>
        </div>
        <form action={action} className="card p-5 space-y-3">
          {mode === "up" && <input name="name" placeholder="Your name" className="input" />}
          <input name="email" type="email" required placeholder="College email" className="input" />
          <input name="password" type="password" required minLength={6} placeholder="Password" className="input" />
          {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
          {state?.info && <p className="text-sm text-emerald-600">{state.info}</p>}
          <button className="btn w-full justify-center" disabled={pending}>{mode === "in" ? "Log in" : "Create account"}</button>
          <button type="button" className="text-sm text-muted w-full" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Sign up" : "Have an account? Log in"}
          </button>
        </form>
        {demo && (
          <div className="space-y-2">
            <p className="label">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[["student", "Student"], ["teacher", "Teacher"], ["admin", "Admin"]].map(([k, l]) => (
                <button key={k} className="btn btn-ghost justify-center" onClick={() => demoLogin(k)}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
