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
    const j = await r.json(); setBusy(false);
    setMsg(j.ok ? { ok: true, text: `Synced ${j.counts.logs} attendance records, ${j.counts.timetable} timetable slots and ${j.counts.events} calendar events.` } : { ok: false, text: j.message ?? "Sync failed." });
    if (j.ok) router.refresh();
  };
  return (
    <div className="space-y-4">
      <form className="folio p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run({ usn: String(f.get("usn")), password: String(f.get("password")) }); e.currentTarget.reset(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field"><label htmlFor="usn" className="label">USN or ERP email</label><input id="usn" name="usn" required autoComplete="username" className="input" /></div>
          <div className="field"><label htmlFor="pw" className="label">ERP password</label><input id="pw" name="password" type="password" required autoComplete="current-password" className="input" /></div>
        </div>
        <p className="text-[14px] text-ink-2">Saved only after the ERP accepts it, encrypted with AES-256-GCM, and used only to sync with erp.mite.ac.in.</p>
        <button className="btn" disabled={busy}>{busy ? "Connecting…" : hasCreds ? "Update and sync" : "Connect and sync"}</button>
      </form>
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-line" disabled={busy} onClick={() => run()}>{busy ? "Syncing…" : "Sync now"}</button>
        {msg && <p role="status" className={`text-[15px] ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
