import { loadStudentData } from "@/lib/data";
import { SyncForm } from "./SyncForm";

export default async function Settings() {
  const d = await loadStudentData();
  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="text-sm space-y-1">
        <p><span className="text-muted">Last sync:</span> {d.lastSync ? new Date(d.lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "never"}</p>
        {d.lastError && <p className="text-rose-600">Last error: {d.lastError}</p>}
        <p><span className="text-muted">Minimum attendance:</span> {Number(d.profile.min_attendance) * 100}%</p>
      </div>
      <SyncForm hasCreds={d.hasCreds} />
    </div>
  );
}
