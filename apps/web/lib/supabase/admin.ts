import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SyncStore } from "@/lib/erp/sync";
import type { TemplateSlot } from "@classpilot/core";

export const supabaseAdmin = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
};

export const adminSyncStore = (): SyncStore => {
  const db = supabaseAdmin();
  return {
    async getCreds(userId) {
      const { data } = await db.from("erp_credentials").select("usn,ciphertext,iv,tag").eq("user_id", userId).maybeSingle();
      return data;
    },
    async upsert(table, rows, onConflict, opts) {
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict, ignoreDuplicates: opts?.ignoreDuplicates ?? false });
        if (error) throw new Error(`${table}: ${error.message}`);
      }
    },
    async setStatus(userId, s) {
      await db.from("erp_credentials").update(s.ok ? { last_sync: new Date().toISOString(), last_error: null } : { last_error: s.error ?? "Sync failed" }).eq("user_id", userId);
      if (s.ok) await db.from("profiles").update({ synced_at: new Date().toISOString() }).eq("id", userId);
    },
    async getTemplate(section) {
      const { data } = await db.from("section_timetable").select("weekday,start,end,options,kind,room").eq("section", section);
      return (data ?? []) as TemplateSlot[];
    },
    async deleteFutureTimetable(userId, fromDate) {
      const { error } = await db.from("timetable").delete().eq("user_id", userId).gte("date", fromDate);
      if (error) throw new Error(`timetable: ${error.message}`);
    },
  };
};
