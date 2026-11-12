"use client";
import { useActionState, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { demoLogin, signIn, signUp, type AuthState } from "./actions";

export default function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [state, action, pending] = useActionState(mode === "in" ? signIn : signUp, null as AuthState);
  const demo = process.env.NEXT_PUBLIC_DEMO === "1";
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between bg-ink text-bg p-12" aria-hidden>
        <span className="headline text-[24px]">ClassPilot</span>
        <div>
          <p className="label" style={{ color: "var(--accent-fill)" }}>MITE · from your ERP</p>
          <p className="display text-[64px] mt-4 max-w-xl" style={{ color: "var(--bg)" }}>Your timetable, attendance and deadlines in <em>one place</em>.</p>
          <div className="rule-double mt-10 max-w-md" style={{ borderColor: "rgb(255 255 255 / .4)" }} />
          <ul className="mono text-[12px] mt-6 space-y-2 opacity-80">
            <li>Today&apos;s classes, with changes your teachers make</li>
            <li>Deadlines turned into a study plan</li>
            <li>The academic calendar, holidays and events</li>
            <li>An assistant that answers from your own data</li>
          </ul>
        </div>
        <span className="mono text-[11px] opacity-60">Built for Mangalore Institute of Technology &amp; Engineering students</span>
      </section>
      <section className="flex flex-col p-6 md:p-12">
        <div className="flex items-center justify-between">
          <span className="headline text-[22px] lg:invisible">ClassPilot</span>
          <ThemeToggle />
        </div>
        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm space-y-8">
            <div>
              <p className="label mb-2">{mode === "in" ? "Welcome back" : "New account"}</p>
              <h1 className="display text-[40px]">{mode === "in" ? "Log in" : "Sign up"}</h1>
            </div>
            <form action={action} className="space-y-4">
              {mode === "up" && <div className="field"><label htmlFor="name" className="label">Name</label><input id="name" name="name" className="input" autoComplete="name" /></div>}
              <div className="field"><label htmlFor="email" className="label">College email</label><input id="email" name="email" type="email" required className="input" autoComplete="email" /></div>
              <div className="field"><label htmlFor="password" className="label">Password</label><input id="password" name="password" type="password" required minLength={6} className="input" autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
              {state?.error && <p role="alert" className="text-bad text-[15px]">{state.error}</p>}
              {state?.info && <p role="status" className="text-ok text-[15px]">{state.info}</p>}
              <button className="btn w-full" disabled={pending}>{pending ? "Please wait…" : mode === "in" ? "Log in" : "Create account"}</button>
            </form>
            <button type="button" className="link min-h-11" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New here? Create an account" : "Have an account? Log in"}
            </button>
            {demo && (
              <div className="pt-6 border-t border-line space-y-3">
                <p className="label">Demo accounts</p>
                <div className="grid grid-cols-3 gap-2">
                  {[["student", "Student"], ["teacher", "Teacher"], ["admin", "Admin"]].map(([k, l]) => (
                    <button key={k} type="button" className="btn btn-line px-2" onClick={() => demoLogin(k)}>{l}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
