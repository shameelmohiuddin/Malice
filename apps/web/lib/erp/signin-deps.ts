import "server-only";
import { createClient } from "@supabase/supabase-js";
import { adminSyncStore, supabaseAdmin } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/crypto";
import { syncUser } from "./sync";
import { realErpDeps, type SignInDeps } from "./signin";

/** A single-use server-side login token for this ClassPilot account (never emailed). */
export const oneTimeToken = async (email: string): Promise<string> => {
  const { data, error } = await supabaseAdmin().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Could not start a session");
  return data.properties.hashed_token;
};

/** Mobile: exchange the one-time token for session tokens the app stores itself. */
export const tokenSession: SignInDeps["startSession"] = async (email) => {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const v = await anon.auth.verifyOtp({ type: "magiclink", token_hash: await oneTimeToken(email) });
  if (v.error || !v.data.session) throw new Error(v.error?.message ?? "No session");
  return { access_token: v.data.session.access_token, refresh_token: v.data.session.refresh_token };
};

/** Everything ERP sign-in needs from Supabase and the ERP; only how the session is handed over differs. */
export const signInDeps = (startSession: SignInDeps["startSession"]): SignInDeps => {
  const admin = supabaseAdmin();
  return {
    ...realErpDeps,
    async findUserByUsn(usn) {
      const { data } = await admin.from("profiles").select("id").ilike("usn", usn.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1).maybeSingle(); // exact, case-insensitive
      return data?.id ?? null;
    },
    async createUser(email, name) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name } });
      if (data.user) return data.user.id;
      // The account exists but its profile lost the USN: find it by its ClassPilot address.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users.find((u) => u.email === email);
      if (!found) throw new Error(error?.message ?? "Could not create the account");
      return found.id;
    },
    async saveProfile(userId, p) {
      const { error } = await admin.from("profiles").update({ name: p.name, usn: p.usn, section: p.section }).eq("id", userId);
      if (error) throw new Error(error.message);
    },
    async saveCreds(userId, usn, password) {
      const { error } = await admin.from("erp_credentials").upsert({ user_id: userId, usn, ...encrypt(password), last_error: null });
      if (error) throw new Error(error.message);
    },
    sync: (userId, raw) => syncUser(userId, adminSyncStore(), { raw }),
    async emailOf(userId) {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (!data.user?.email) throw new Error(error?.message ?? "Account has no login address");
      return data.user.email;
    },
    startSession,
  };
};
