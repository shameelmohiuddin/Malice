import { api, okJson } from "@/lib/api";
export const GET = api(async ({ supabase, user, profile }) => {
  const { data: creds } = await supabase.from("erp_credentials").select("usn,last_sync,last_error").eq("user_id", user.id).maybeSingle();
  return okJson({
    id: user.id, email: user.email ?? null, name: profile.name, role: profile.role, section: profile.section,
    minAttendance: Math.round(Number(profile.min_attendance) * 100),
    erp: { connected: !!creds, usn: creds?.usn ?? null, lastSync: creds?.last_sync ?? null, lastError: creds?.last_error ?? null },
  });
});
