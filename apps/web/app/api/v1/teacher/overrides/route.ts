import { api, body, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
import { ValidationError } from "@/lib/validate";
/** POST { action: "cancel"|"extra", section, courseCode, date, start, end, room? } */
export const POST = api(async (ctx, req) => {
  const b = (await body(req)) as { action?: string };
  if (b?.action === "cancel") await teacher.cancelClass(ctx, b);
  else if (b?.action === "extra") await teacher.addExtraClass(ctx, b);
  else throw new ValidationError('action must be "cancel" or "extra"');
  return okJson({ done: true }, 201);
});
