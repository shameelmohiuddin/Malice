import Link from "next/link";
import { addDays, prettyDate, todayIST } from "@bunk/core";
import { Nav } from "@/components/Nav";
import { getSession } from "@/lib/data";
import { redirect } from "next/navigation";
import { addExtraClass, cancelClass, createEvent, postDeadline, setClassroomUrl, setEventCancelled, undoOverride } from "./actions";

export default async function Teacher({ searchParams }: { searchParams: Promise<{ date?: string; section?: string }> }) {
  const { supabase: sb, profile } = await getSession();
  if (profile.role === "student") redirect("/dashboard");
  const sp = await searchParams;
  const date = sp.date ?? todayIST();
  const section = sp.section ?? "5CS3";
  const [tt, ov, courses, events, dls] = await Promise.all([
    sb.from("timetable").select("date,start,end,course_code,room").eq("section", section).eq("date", date).not("course_code", "is", null).order("start"),
    sb.from("schedule_overrides").select("*").eq("section", section).gte("date", todayIST()).order("date"),
    sb.from("courses").select("code,name,classroom_url").order("name"),
    sb.from("events").select("*").gte("end_date", addDays(todayIST(), -7)).order("start_date"),
    sb.from("deadlines").select("*").eq("scope", "class").gte("due", todayIST()).order("due"),
  ]);
  const name = (c: string) => courses.data?.find((x) => x.code === c)?.name ?? c;
  const seen = new Set<string>();
  const classes = (tt.data ?? []).filter((t) => { const k = t.start + t.course_code; if (seen.has(k)) return false; seen.add(k); return true; });
  const cancelledOn = (start: string, code: string) => ov.data?.find((o) => o.action === "cancel" && o.date === date && o.start === start && o.course_code === code);
  const links: [string, string][] = [["/teacher", "Teacher console"], ["/dashboard", "Student view"]];
  return (
    <>
      <Nav links={links} name={`${profile.name ?? ""} · ${profile.role}`} />
      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Section {section}</h1>
            <div className="flex gap-1 text-sm">
              <Link className="btn btn-ghost" href={`/teacher?date=${addDays(date, -1)}&section=${section}`}>←</Link>
              <Link className="btn btn-ghost" href={`/teacher?section=${section}`}>Today</Link>
              <Link className="btn btn-ghost" href={`/teacher?date=${addDays(date, 1)}&section=${section}`}>→</Link>
            </div>
          </div>
          <div className="card">
            <p className="label px-4 pt-3">{prettyDate(date)}</p>
            <ul className="divide-y divide-line">
              {classes.length === 0 && <li className="p-4 text-sm text-muted">No classes on this day.</li>}
              {classes.map((t) => {
                const c = cancelledOn(t.start, t.course_code!);
                return (
                  <li key={t.start + t.course_code} className="p-3 flex items-center gap-3 text-sm">
                    <span className="tabular-nums text-muted w-24">{t.start}–{t.end}</span>
                    <span className={`flex-1 font-medium ${c ? "line-through text-muted" : ""}`}>{name(t.course_code!)}</span>
                    {c
                      ? <form action={undoOverride.bind(null, c.id)}><button className="btn btn-ghost">Undo</button></form>
                      : <form action={cancelClass.bind(null, section, t.course_code!, date, t.start, t.end)}><button className="btn bg-rose-600">Cancel</button></form>}
                  </li>
                );
              })}
            </ul>
          </div>
          <form action={addExtraClass} className="card p-4 space-y-2">
            <p className="font-semibold">Add extra class</p>
            <input type="hidden" name="section" value={section} />
            <select name="course" required className="input">{courses.data?.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
            <div className="grid grid-cols-3 gap-2">
              <input name="date" type="date" required defaultValue={date} className="input" />
              <input name="start" type="time" required defaultValue="15:35" className="input" />
              <input name="end" type="time" required defaultValue="16:30" className="input" />
            </div>
            <input name="room" placeholder="Room (e.g. LH-A203)" className="input" />
            <button className="btn">Add class</button>
          </form>
          <div className="card p-4 space-y-2">
            <p className="font-semibold">Upcoming changes</p>
            {(ov.data ?? []).length === 0 && <p className="text-sm text-muted">None.</p>}
            {ov.data?.map((o) => (
              <div key={o.id} className="flex items-center gap-2 text-sm">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${o.action === "cancel" ? "bg-rose-100 text-rose-700" : "bg-accent/15 text-accent"}`}>{o.action}</span>
                <span className="flex-1">{name(o.course_code)} · {prettyDate(o.date)} {o.start}</span>
                <form action={undoOverride.bind(null, o.id)}><button className="text-xs text-muted hover:text-rose-600">Undo</button></form>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <form action={postDeadline} className="card p-4 space-y-2">
            <p className="font-semibold">Post deadline to {section}</p>
            <input type="hidden" name="section" value={section} />
            <input name="title" required placeholder="e.g. DBMS Quiz 2" className="input" />
            <div className="grid grid-cols-3 gap-2">
              <select name="course" className="input">{courses.data?.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
              <select name="kind" className="input"><option value="quiz">Quiz</option><option value="assignment">Assignment</option><option value="exam">Exam</option></select>
              <input name="due" type="date" required min={todayIST()} className="input" />
            </div>
            <button className="btn">Post</button>
            <ul className="text-sm divide-y divide-line">{dls.data?.map((x) => <li key={x.id} className="py-1.5">{prettyDate(x.due)} · {x.title}</li>)}</ul>
          </form>
          <form action={createEvent} className="card p-4 space-y-2">
            <p className="font-semibold">Create event</p>
            <input name="title" required placeholder="e.g. Hackathon finals" className="input" />
            <div className="grid grid-cols-3 gap-2">
              <input name="start" type="date" required className="input" />
              <input name="end" type="date" className="input" />
              <select name="category" className="input"><option>EVENT</option><option>WORKSHOP</option><option>FEST</option><option>SEMINAR</option></select>
            </div>
            <button className="btn">Create</button>
          </form>
          <div className="card divide-y divide-line">
            <p className="label px-4 pt-3 pb-2">Events</p>
            {events.data?.map((e) => (
              <div key={e.id} className="px-4 py-2 flex items-center gap-2 text-sm">
                <span className="w-24 text-muted">{prettyDate(e.start_date)}</span>
                <span className={`flex-1 ${e.cancelled ? "line-through text-muted" : ""}`}>{e.title}</span>
                {e.source === "app"
                  ? <form action={setEventCancelled.bind(null, e.id, !e.cancelled)}><button className="text-xs font-semibold text-muted hover:text-rose-600">{e.cancelled ? "Restore" : "Cancel"}</button></form>
                  : <span className="text-[11px] text-muted">ERP</span>}
              </div>
            ))}
          </div>
          <div className="card p-4 space-y-2">
            <p className="font-semibold">Google Classroom links</p>
            {courses.data?.map((c) => (
              <form key={c.code} action={setClassroomUrl.bind(null, c.code)} className="flex gap-2 items-center">
                <span className="text-sm w-40 truncate" title={c.name}>{c.name}</span>
                <input name="url" defaultValue={c.classroom_url ?? ""} placeholder="https://classroom.google.com/c/…" className="input" />
                <button className="btn btn-ghost">Save</button>
              </form>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
