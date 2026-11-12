// Creates the demo accounts and loads the ERP snapshot for the demo students.
// Run: npm run seed -w web   (reads apps/web/.env.local)
import { adminSyncStore, supabaseAdmin } from "../lib/supabase/admin";
import { syncUser } from "../lib/erp/sync";

const USERS = [
  { email: "admin@demo.bunk", name: "Demo Admin", role: "admin" },
  { email: "teacher@demo.bunk", name: "Prof. Demo", role: "teacher" },
  { email: "student1@demo.bunk", name: "Demo Student", role: "student" },
  { email: "student2@demo.bunk", name: "Demo Student 2", role: "student" },
] as const;

const main = async () => {
  const db = supabaseAdmin();
  const password = process.env.DEMO_PASSWORD!;
  const { data: list } = await db.auth.admin.listUsers();
  for (const u of USERS) {
    let id = list.users.find((x) => x.email === u.email)?.id;
    if (!id) {
      const { data, error } = await db.auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: { name: u.name } });
      if (error) throw error;
      id = data.user.id;
    } else await db.auth.admin.updateUserById(id, { password });
    await db.from("profiles").update({ role: u.role, name: u.name, section: "5CS3" }).eq("id", id);
    if (u.role === "student") {
      const r = await syncUser(id, adminSyncStore(), { snapshot: true });
      console.log(u.email, JSON.stringify(r));
    } else console.log(u.email, u.role);
  }
  await db.from("courses").update({ classroom_url: "https://classroom.google.com/" }).eq("code", "23CSPE311");
};
main().catch((e) => { console.error(e); process.exit(1); });
