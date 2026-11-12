"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import { ThemeToggle } from "./ThemeToggle";

export function Nav({ links, name, section, role }: { links: [string, string][]; name: string; section?: string | null; role?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "·";
  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-line">
      <div className="wrap h-[72px] flex items-center gap-6">
        <Link href="/" className="flex flex-col leading-none shrink-0">
          <span className="headline text-[22px]">ClassPilot</span>
          <span className="label text-accent mt-1 hidden sm:block" style={{ fontSize: 9 }}>Your semester, in one place</span>
        </Link>
        <nav aria-label="Main" className="hidden lg:flex items-center gap-1 ml-4">
          {links.map(([href, label]) => {
            const active = path === href || path.startsWith(href + "/");
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`mono text-[12px] uppercase tracking-[0.1em] px-3.5 py-2.5 ${active ? "bg-panel text-ink font-bold" : "text-ink-2 hover:text-ink hover:bg-panel/60"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {section && <span className="tag hidden sm:inline-flex">{section}{role && role !== "student" ? ` · ${role}` : ""}</span>}
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2 pl-2">
            <span className="w-8 h-8 rounded-full bg-ink text-bg grid place-items-center mono text-[11px] font-bold" aria-hidden>{initials}</span>
            <span className="mono text-[12px] text-ink-2 max-w-[140px] truncate">{name}</span>
          </div>
          <form action={signOut} className="hidden lg:block"><button className="link px-2 min-h-11">Log out</button></form>
          <button type="button" className="lg:hidden w-11 h-11 grid place-items-center border border-line" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>{open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}</svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Main" className="lg:hidden border-t border-line bg-bg">
          <div className="wrap py-3 grid">
            {links.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={path.startsWith(href) ? "page" : undefined}
                className={`mono uppercase text-[13px] tracking-[0.1em] py-3.5 border-b border-line ${path.startsWith(href) ? "text-ink font-bold" : "text-ink-2"}`}>{label}</Link>
            ))}
            <form action={signOut}><button className="mono uppercase text-[13px] tracking-[0.1em] py-3.5 text-ink-2 w-full text-left">Log out</button></form>
          </div>
        </nav>
      )}
    </header>
  );
}
