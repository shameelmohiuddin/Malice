import { api, okJson } from "@/lib/api";
import { teacher } from "@/lib/teacher";
export const DELETE = api<{ id: string }>(async (ctx, _req, { id }) => { await teacher.undoOverride(ctx, id); return okJson({ id }); });
