import { Nav } from "@/components/Nav";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Assistant } from "@/components/Assistant";
import { loadStudentData } from "@/lib/data";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const d = await loadStudentData();
  const links: [string, string][] = [["/dashboard", "Dashboard"], ["/timetable", "Timetable"], ["/calendar", "Calendar"], ["/planner", "Planner"], ["/settings", "Settings"]];
  if (d.profile.role !== "student") links.push(["/teacher", "Teacher"]);
  return (
    <>
      <Nav links={links} name={d.profile.name ?? ""} />
      <RealtimeRefresh />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-28">{children}</main>
      <Assistant data={{ stats: d.stats, timetable: d.timetable, events: d.events, deadlines: d.deadlines, classroom: d.classroom }} />
    </>
  );
}
