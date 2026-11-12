"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function addDeadline(form: FormData) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("deadlines").insert({
    title: String(form.get("title")), course_code: String(form.get("course")) || null, due: String(form.get("due")),
    kind: String(form.get("kind")), scope: "personal", owner_id: user.id,
  });
  revalidatePath("/", "layout");
}

export async function deleteDeadline(id: string) {
  const sb = await supabaseServer();
  await sb.from("deadlines").delete().eq("id", id);
  revalidatePath("/", "layout");
}
