import { api, body, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
import { ValidationError } from "@/lib/validate";
/** PATCH { cancelled: boolean } */
export const PATCH = api<{ id: string }>(async (ctx, req, { id }) => {
  const b = (await body(req)) as { cancelled?: unknown };
  if (typeof b?.cancelled !== "boolean") throw new ValidationError("cancelled must be true or false");
  await teacher.setEventCancelled(ctx, id, b.cancelled);
  return okJson({ id, cancelled: b.cancelled });
});
