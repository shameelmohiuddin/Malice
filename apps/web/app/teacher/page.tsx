import Link from "next/link";
import { redirect } from "next/navigation";
import { addDays, isISODate, prettyDate, shortName, todayIST } from "@classpilot/core";
import { Nav } from "@/components/Nav";
import { SectionHead, Empty } from "@/components/ui";
import { getSession } from "@/lib/data";
import { teacher } from "@/lib/teacher";
import { addExtraClass, cancelClass, createEvent, postDeadline, setClassroomUrl, setEventCancelled, undoOverride } from "./actions";

export default async function Teacher({ searchParams }: { searchParams: Promise<{ date?: string; section?: string }> }) {
  const ctx = await getSession();
  if (ctx.profile.role === "student") redirect("/dashboard");
  const sp = await searchParams;
  const date = isISODate(sp.date) ? sp.date : todayIST();
  const section = /^[A-Za-z0-9-]{1,20}$/.test(sp.section ?? "") ? sp.section! : "5CS3";
  const sb = ctx.supabase;
  const [classes, ov, courses, events, dls] = await Promise.all([
    teacher.dayClasses(ctx, section, date),
    sb.from("schedule_overrides").select("*").eq("section", section).gte("date", todayIST()).order("date").order("start"),
    sb.from("courses").select("code,name,classroom_url").order("name"),
    sb.from("events").select("*").gte("end_date", addDays(todayIST(), -7)).order("start_date"),
    sb.from("deadlines").select("*").eq("scope", "class").gte("due", todayIST()).order("due"),
  ]);
  const name = (c: string) => courses.data?.find((x) => x.code === c)?.name ?? c;
  const q = (dt: string) => `/teacher?date=${dt}&section=${section}`;
  return (
    <>
      <Nav links={[["/teacher", "Teacher console"], ["/dashboard", "Student view"]]} name={ctx.profile.name ?? ""} section={section} role={ctx.profile.role} />
      <main id="main" className="wrap pt-8 md:pt-10 pb-24 space-y-12">
        <section aria-labelledby="t-h" className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label mb-3">Section {section} · changes reach students instantly</p>
            <h1 id="t-h" className="display text-[38px] md:text-[56px]">Teacher console</h1>
          </div>
          <nav aria-label="Day" className="flex gap-2 w-full sm:w-auto [&>a]:flex-1 sm:[&>a]:flex-none">
            <Link className="btn btn-line" href={q(addDays(date, -1))} aria-label="Previous day">←<span className="hidden sm:inline"> Previous day</span></Link>
            <Link className="btn btn-line" href={`/teacher?section=${section}`}>Today</Link>
            <Link className="btn btn-line" href={q(addDays(date, 1))} aria-label="Next day"><span className="hidden sm:inline">Next day </span>→</Link>
          </nav>
        </section>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-10">
            <section aria-labelledby="day-h">
              <SectionHead index="01" id="day-h" title={prettyDate(date)} meta={`${classes.length} classes`} />
              {classes.length === 0 ? <div className="plate p-5"><Empty>No classes on this day.</Empty></div> : (
                <ul className="folio divide-y divide-line">
                  {classes.map((c: any) => (
                    <li key={c.start + c.courseCode} className="px-4 py-3 flex items-center gap-4">
                      <span className="mono text-[12px] w-[96px] shrink-0">{c.start}–{c.end}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block font-semibold ${c.cancelled ? "line-through text-muted" : ""}`}>{shortName(c.courseName)}</span>
                        <span className="block text-[13px] text-ink-2 truncate">{c.courseName}{c.room ? ` · ${c.room}` : ""}</span>
                      </span>
                      {c.extra && <span className="tag tag-ink">Extra</span>}
                      {c.cancelled || c.extra
                        ? <form action={undoOverride.bind(null, c.overrideId)}><button className="btn btn-line">Undo</button></form>
                        : <form action={cancelClass.bind(null, section, c.courseCode, date, c.start, c.end)}><button className="btn btn-bad">Cancel</button></form>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="extra-h">
              <SectionHead index="02" id="extra-h" title="Add an extra class" />
              <form action={addExtraClass} className="folio p-5 space-y-4">
                <input type="hidden" name="section" value={section} />
                <div className="field"><label htmlFor="ex-course" className="label">Subject</label>
                  <select id="ex-course" name="course" required className="input">{courses.data?.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="field"><label htmlFor="ex-date" className="label">Date</label><input id="ex-date" name="date" type="date" required defaultValue={date} className="input" /></div>
                  <div className="field"><label htmlFor="ex-start" className="label">Start</label><input id="ex-start" name="start" type="time" required defaultValue="15:35" className="input" /></div>
                  <div className="field"><label htmlFor="ex-end" className="label">End</label><input id="ex-end" name="end" type="time" required defaultValue="16:30" className="input" /></div>
                </div>
                <div className="field"><label htmlFor="ex-room" className="label">Room</label><input id="ex-room" name="room" placeholder="LH-A203" className="input" /></div>
                <button className="btn">Add class</button>
              </form>
            </section>

            <section aria-labelledby="changes-h">
              <SectionHead index="03" id="changes-h" title="Upcoming changes" />
              {(ov.data ?? []).length === 0 ? <Empty>No changes scheduled.</Empty> : (
                <ul className="folio divide-y divide-line">
                  {ov.data!.map((o) => (
                    <li key={o.id} className="px-4 py-3 flex items-center gap-3">
                      <span className={`tag ${o.action === "cancel" ? "tag-bad" : "tag-ink"}`}>{o.action === "cancel" ? "Cancelled" : "Extra"}</span>
                      <span className="flex-1 text-[15px]">{shortName(name(o.course_code))} · {prettyDate(o.date)} {o.start}</span>
                      <form action={undoOverride.bind(null, o.id)}><button className="link min-h-11 px-1">Undo</button></form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-10">
            <section aria-labelledby="dl-h">
              <SectionHead index="04" id="dl-h" title="Post a deadline" />
              <form action={postDeadline} className="folio p-5 space-y-4">
                <input type="hidden" name="section" value={section} />
                <div className="field"><label htmlFor="d-title" className="label">Title</label><input id="d-title" name="title" required maxLength={120} placeholder="DBMS quiz 3" className="input" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="field"><label htmlFor="d-course" className="label">Subject</label><select id="d-course" name="course" className="input">{courses.data?.map((c) => <option key={c.code} value={c.code}>{shortName(c.name)}</option>)}</select></div>
                  <div className="field"><label htmlFor="d-kind" className="label">Type</label><select id="d-kind" name="kind" className="input"><option value="quiz">Quiz</option><option value="assignment">Assignment</option><option value="exam">Exam</option></select></div>
                  <div className="field"><label htmlFor="d-due" className="label">Due</label><input id="d-due" name="due" type="date" required min={todayIST()} className="input" /></div>
                </div>
                <button className="btn">Post to {section}</button>
                {(dls.data ?? []).length > 0 && <ul className="pt-3 border-t border-line space-y-1">{dls.data!.map((x) => <li key={x.id} className="mono text-[12px]">{prettyDate(x.due)} · {x.title}</li>)}</ul>}
              </form>
            </section>

            <section aria-labelledby="ev-h">
              <SectionHead index="05" id="ev-h" title="Events" />
              <form action={createEvent} className="folio p-5 space-y-4">
                <div className="field"><label htmlFor="e-title" className="label">Title</label><input id="e-title" name="title" required maxLength={120} placeholder="Coding club meet" className="input" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="field"><label htmlFor="e-start" className="label">Starts</label><input id="e-start" name="start" type="date" required className="input" /></div>
                  <div className="field"><label htmlFor="e-end" className="label">Ends</label><input id="e-end" name="end" type="date" className="input" /></div>
                  <div className="field"><label htmlFor="e-cat" className="label">Type</label><select id="e-cat" name="category" className="input"><option>EVENT</option><option>WORKSHOP</option><option>FEST</option><option>SEMINAR</option></select></div>
                </div>
                <button className="btn">Create event</button>
              </form>
              <ul className="folio divide-y divide-line mt-3">
                {events.data?.map((e) => (
                  <li key={e.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="mono text-[12px] w-[96px] shrink-0">{prettyDate(e.start_date)}</span>
                    <span className={`flex-1 text-[15px] ${e.cancelled ? "line-through text-muted" : ""}`}>{e.title}</span>
                    {e.source === "app"
                      ? <form action={setEventCancelled.bind(null, e.id, !e.cancelled)}><button className="link min-h-11 px-1">{e.cancelled ? "Restore" : "Cancel"}</button></form>
                      : <span className="tag">ERP</span>}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="cr-h">
              <SectionHead index="06" id="cr-h" title="Google Classroom links" />
              <div className="folio divide-y divide-line">
                {courses.data?.map((c) => (
                  <form key={c.code} action={setClassroomUrl.bind(null, c.code)} className="p-3 flex items-center gap-3">
                    <label htmlFor={`cr-${c.code}`} className="mono text-[12px] font-bold w-[72px] shrink-0">{shortName(c.name)}</label>
                    <input id={`cr-${c.code}`} name="url" defaultValue={c.classroom_url ?? ""} placeholder="https://classroom.google.com/c/…" className="input" />
                    <button className="btn btn-line">Save</button>
                  </form>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
