// Re-run the ERP sync for every user: live ERP for connected accounts, the snapshot for demo students.
// Run: npm run resync -w web
import { adminSyncStore, supabaseAdmin } from "../lib/supabase/admin";
import { syncUser } from "../lib/erp/sync";

(async () => {
  const db = supabaseAdmin();
  const { data: creds } = await db.from("erp_credentials").select("user_id");
  const live = new Set((creds ?? []).map((c) => c.user_id));
  const { data: students } = await db.from("profiles").select("id,name,role");
  for (const p of students ?? []) {
    if (!live.has(p.id) && p.role !== "student") continue;
    const r = await syncUser(p.id, adminSyncStore(), { snapshot: !live.has(p.id) });
    console.log(p.name, live.has(p.id) ? "live" : "snapshot", r.ok ? JSON.stringify(r.counts) : `${r.error}: ${r.message}`);
  }
})();
