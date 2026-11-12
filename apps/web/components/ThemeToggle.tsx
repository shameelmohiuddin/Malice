"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => { setTheme((document.documentElement.dataset.theme as "light" | "dark") ?? "light"); }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("cp-theme", next); } catch {}
    setTheme(next);
  };
  return (
    <button type="button" onClick={flip} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-11 h-11 grid place-items-center text-ink-2 hover:text-ink border border-transparent hover:border-line">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        {theme === "dark"
          ? <><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></>
          : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />}
      </svg>
    </button>
  );
}
