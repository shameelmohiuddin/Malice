"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncForm({ hasCreds }: { hasCreds: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const run = async (body?: { usn: string; password: string }) => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/erp/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? { ok: true, text: `Synced: ${j.counts.logs} attendance records, ${j.counts.timetable} timetable slots, ${j.counts.events} events.` } : { ok: false, text: j.message ?? "Sync failed" });
    if (j.ok) router.refresh();
  };
  return (
    <div className="space-y-4">
      <form className="card p-4 space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run({ usn: String(f.get("usn")), password: String(f.get("password")) }); e.currentTarget.reset(); }}>
        <p className="font-semibold">MITE ERP account</p>
        <input name="usn" required placeholder="USN (e.g. 4MT24CS000)" className="input" autoComplete="username" />
        <input name="password" type="password" required placeholder="ERP password" className="input" autoComplete="current-password" />
        <p className="text-xs text-muted">Your password is encrypted (AES-256-GCM) before it's stored and is only used to sync with erp.mite.ac.in.</p>
        <button className="btn" disabled={busy}>{busy ? "Syncing…" : hasCreds ? "Update & sync" : "Connect & sync"}</button>
      </form>
      <button className="btn btn-ghost" disabled={busy} onClick={() => run()}>{busy ? "Syncing…" : "Sync now"}</button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
    </div>
  );
}
