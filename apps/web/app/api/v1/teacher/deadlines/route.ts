import { api, body, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
/** POST { title, due, kind, courseCode?, section } → class-wide deadline */
export const POST = api(async (ctx, req) => { await teacher.postDeadline(ctx, await body(req)); return okJson({ done: true }, 201); });
