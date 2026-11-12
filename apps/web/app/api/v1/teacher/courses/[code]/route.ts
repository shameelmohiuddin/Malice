import { api, body, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
/** PATCH { classroomUrl: string|null } */
export const PATCH = api<{ code: string }>(async (ctx, req, { code }) => {
  const b = (await body(req)) as { classroomUrl?: string | null };
  await teacher.setClassroomUrl(ctx, code, b?.classroomUrl ?? null);
  return okJson({ code, classroomUrl: b?.classroomUrl ?? null });
});
