import { ask, nowMinutesIST } from "@classpilot/core";
import { api, body, okJson } from "@/lib/api";
import { loadStudentDataFor } from "@/lib/data";
import { ValidationError } from "@/lib/validate";
/** POST { text } → { text, navigate?, openUrl?, options? }. Runs the rule-based engine server-side (same code the UI runs offline). */
export const POST = api(async (ctx, req) => {
  const b = (await body(req)) as { text?: unknown };
  if (typeof b?.text !== "string" || !b.text.trim() || b.text.length > 300) throw new ValidationError("text is required (max 300 chars)");
  const d = await loadStudentDataFor(ctx);
  return okJson(ask(b.text, { ...d, min: Number(d.profile.min_attendance ?? 0.75), names: Object.fromEntries(Object.entries(d.catalog).map(([code, c]) => [code, c.name])) }, d.today, nowMinutesIST()));
});
