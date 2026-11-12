import { api, fail, okJson } from "@/lib/api";
export const DELETE = api<{ id: string }>(async ({ supabase, user }, _req, { id }) => {
  const { data, error } = await supabase.from("deadlines").delete().eq("id", id).eq("owner_id", user.id).select("id");
  if (error) throw new Error(error.message);
  return data?.length ? okJson({ id }) : fail(404, "NOT_FOUND", "No such deadline of yours.");
});
