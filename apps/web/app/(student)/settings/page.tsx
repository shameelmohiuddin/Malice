import { loadStudentData } from "@/lib/data";
import { SectionHead } from "@/components/ui";
import { SyncForm } from "./SyncForm";
import { MinForm } from "./MinForm";

export default async function Settings() {
  const d = await loadStudentData();
  return (
    <div className="space-y-12 max-w-3xl">
      <section aria-labelledby="st-h">
        <p className="label mb-3">Account · {d.profile.name}</p>
        <h1 id="st-h" className="display text-[38px] md:text-[56px]">Settings</h1>
      </section>
      <section aria-labelledby="erp-h">
        <SectionHead index="01" id="erp-h" title="MITE ERP" meta={d.lastSync ? `Last sync ${new Date(d.lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Not synced yet"} />
        {d.lastError && <p className="mb-4 px-4 py-3 border border-bad text-bad">Last sync failed: {d.lastError}</p>}
        <SyncForm hasCreds={d.hasCreds} />
      </section>
      <section aria-labelledby="min-h">
        <SectionHead index="02" id="min-h" title="Minimum attendance" />
        <MinForm current={Math.round(Number(d.profile.min_attendance) * 100)} />
      </section>
    </div>
  );
}
