import { Nav } from "@/components/Nav";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Assistant } from "@/components/Assistant";
import { loadStudentData } from "@/lib/data";

const STUDENT_LINKS: [string, string][] = [["/dashboard", "Today"], ["/timetable", "Timetable"], ["/calendar", "Calendar"], ["/planner", "Study planner"], ["/attendance", "Attendance"], ["/settings", "Settings"]];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const d = await loadStudentData();
  const links = d.profile.role === "student" ? STUDENT_LINKS : [...STUDENT_LINKS, ["/teacher", "Teacher"] as [string, string]];
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn">Skip to content</a>
      <Nav links={links} name={d.profile.name ?? ""} section={d.profile.section} role={d.profile.role} />
      <RealtimeRefresh />
      <main id="main" className="wrap pt-8 md:pt-10 pb-32">{children}</main>
      <footer className="border-t border-line">
        <div className="wrap pt-6 pb-24 flex flex-wrap justify-between gap-3">
          <span className="flex items-baseline gap-2"><span className="headline text-[18px]">ClassPilot</span><span className="italic text-ink-2 text-[14px]">for MITE students and teachers</span></span>
          <span className="label">{d.lastSync ? `ERP synced ${new Date(d.lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Not synced with the ERP yet"}</span>
        </div>
      </footer>
      <Assistant data={{ stats: d.stats, timetable: d.timetable, events: d.events, deadlines: d.deadlines, classroom: d.classroom, min: Number(d.profile.min_attendance ?? 0.75) }} />
    </>
  );
}
