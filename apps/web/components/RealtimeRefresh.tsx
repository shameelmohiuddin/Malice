"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Re-render server data when teachers change the schedule, events or deadlines. */
export function RealtimeRefresh() {
  const router = useRouter();
  useEffect(() => {
    const sb = supabaseBrowser();
    const ch = sb.channel("live");
    for (const table of ["schedule_overrides", "events", "deadlines"])
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh());
    ch.subscribe();
    return () => { sb.removeChannel(ch); };
  }, [router]);
  return null;
}
