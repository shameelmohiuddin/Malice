"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MinForm({ current }: { current: number }) {
  const [value, setValue] = useState(String(current));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await fetch("/api/v1/settings", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ minAttendance: Number(value) }) });
    const j = await r.json(); setBusy(false);
    setMsg(j.ok ? { ok: true, text: `Saved: ${j.data.minAttendance}%.` } : { ok: false, text: j.message });
    if (j.ok) router.refresh();
  };
  return (
    <form onSubmit={save} className="folio p-5 flex flex-wrap items-end gap-4">
      <div className="field w-40"><label htmlFor="min" className="label">Percent (75–95)</label><input id="min" type="number" min={75} max={95} step={1} value={value} onChange={(e) => setValue(e.target.value)} className="input num" aria-describedby="min-msg" /></div>
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      <p id="min-msg" className={`basis-full text-[15px] ${msg ? (msg.ok ? "text-ok" : "text-bad") : "text-ink-2"}`} role="status">{msg?.text ?? "MITE requires 85%. Between 75% and 85% needs condonation; below 75% you are not eligible."}</p>
    </form>
  );
}
