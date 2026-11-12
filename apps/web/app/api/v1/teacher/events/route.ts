import { api, body, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
/** POST { title, start, end?, category? } */
export const POST = api(async (ctx, req) => { await teacher.createEvent(ctx, await body(req)); return okJson({ done: true }, 201); });
