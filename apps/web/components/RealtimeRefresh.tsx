"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Re-render server data when teachers change the schedule, events or deadlines.
 * The socket must carry the user's JWT before subscribing: these tables are
 * readable only by logged-in users, and Realtime applies the same RLS.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser();
    let ch: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session || cancelled) return;
      await sb.realtime.setAuth(session.access_token);
      ch = sb.channel("live");
      for (const table of ["schedule_overrides", "events", "deadlines"])
        ch.on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh());
      ch.subscribe((status) => { (window as any).__realtime = status; });
    })();
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { if (s) sb.realtime.setAuth(s.access_token); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); if (ch) sb.removeChannel(ch); };
  }, [router]);
  return null;
}
