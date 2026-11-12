"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

export function Nav({ links, name }: { links: [string, string][]; name: string }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-extrabold tracking-tight shrink-0">Bunk<span className="text-accent">Smart</span></Link>
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${path.startsWith(href) ? "bg-accent text-white font-semibold" : "text-muted hover:text-ink"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm shrink-0">
          <span className="text-muted hidden sm:inline">{name}</span>
          <form action={signOut}><button className="text-muted hover:text-ink">Log out</button></form>
        </div>
      </div>
    </header>
  );
}
