import { Pressable, ScrollView, Text, View } from "react-native";
import { addDays, nowMinutesIST, overall, parseHHMM, pct, planStudy, prettyDate, shortName, todayIST } from "@classpilot/core";
import { describe, type Bundle } from "../lib/sync";
import { ClassroomLink, Dot, Empty, SectionHead, Tag } from "./parts";
import { attendanceStatus, F, pctText, statusColor, useTheme } from "./theme";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function Today({ b, go }: { b: Bundle; go: (tab: string) => void }) {
  const { c, s } = useTheme();
  const today = todayIST();
  const now = nowMinutesIST();
  const min = Number(b.profile.min_attendance ?? 0.75);
  const info = (code: string | null) => describe(b, code);
  const name = (code: string | null) => info(code).full;
  const isClass = (t: { courseCode: string | null }) => !!t.courseCode && !info(t.courseCode).activity;
  const first = (b.profile.name ?? "").split(/\s+/)[0] || "there";
  const greeting = now < 720 ? "Good morning" : now < 1020 ? "Good afternoon" : "Good evening";

  const slots = b.timetable.filter((t) => t.date === today).sort((a, x) => parseHHMM(a.start) - parseHHMM(x.start));
  const classesToday = slots.filter((t) => isClass(t) && !t.cancelled).length;
  const next = b.timetable.filter((t) => isClass(t) && !t.cancelled && (t.date > today || (t.date === today && parseHHMM(t.end) > now)))
    .sort((a, x) => (a.date === x.date ? parseHHMM(a.start) - parseHHMM(x.start) : a.date < x.date ? -1 : 1))[0];
  const nextIsNow = next && next.date === today && parseHHMM(next.start) <= now;
  const horizon = addDays(today, 14);
  const coming = [
    ...b.deadlines.filter((d) => d.due >= today && d.due <= horizon).map((d) => ({ id: d.id, date: d.due, title: d.title, sub: d.courseCode ? shortName(name(d.courseCode)) : "Deadline", tag: d.kind, tone: "ink" as const, cancelled: false })),
    ...b.events.filter((e) => e.end >= today && e.start <= horizon).map((e) => ({ id: e.id, date: e.start < today ? today : e.start, title: e.title, sub: e.category.toLowerCase(), tag: e.isHoliday ? "Holiday" : "Event", tone: e.isHoliday ? "ok" as const : "plain" as const, cancelled: e.cancelled })),
  ].sort((a, x) => (a.date < x.date ? -1 : 1)).slice(0, 6);
  const plan = planStudy(b.timetable, b.deadlines.filter((d) => d.due >= today), today, 14, now).blocks.filter((x) => x.date <= addDays(today, 1)).slice(0, 3);
  const o = overall(b.stats);
  const below = b.stats.filter((x) => pct(x.present, x.held) < min * 100);

  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>{DAYS[new Date(today + "T00:00:00Z").getUTCDay()]}, {+today.slice(8)} {MONTHS[+today.slice(5, 7) - 1]}</Text>
        <Text style={s.display} accessibilityRole="header">{greeting},{"\n"}<Text style={{ fontFamily: F.displayItalic }}>{first}</Text>.</Text>
        <Text style={s.body2}>
          {classesToday ? `${classesToday} ${classesToday === 1 ? "class" : "classes"} today` : "No classes today"}
          {below.length ? `. ${below.map((x) => shortName(x.name)).join(", ")} below ${Math.round(min * 100)}%.` : "."}
        </Text>
      </View>

      <View style={[s.folio, { padding: 16, gap: 10 }]}>
        <View style={s.band}>
          <Text style={[s.label, { color: c.accent }]}>{nextIsNow ? "Now" : "Next class"}</Text>
          {next && <Text style={s.label}>{next.date === today ? (nextIsNow ? `until ${next.end}` : `at ${next.start}`) : prettyDate(next.date)}</Text>}
        </View>
        {next ? (
          <>
            <Text style={s.headline}>{shortName(name(next.courseCode))} <Text style={{ color: c.ink2, fontFamily: F.serif }}>at {next.start}</Text></Text>
            <Text style={s.body2}>{name(next.courseCode)}{info(next.courseCode).instructor ? ` · ${info(next.courseCode).instructor}` : ""}</Text>
            <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
              {next.room && <Tag>{next.room}</Tag>}
              {next.extra && <Tag tone="ink">Extra</Tag>}
            </View>
            <ClassroomLink url={b.classroom[next.courseCode!]} />
          </>
        ) : <Empty>No upcoming classes.</Empty>}
      </View>

      <View>
        <SectionHead index="01" title="Today's schedule" />
        {slots.length === 0 ? <Empty>Nothing scheduled today.</Empty> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {slots.map((t) => {
              const done = parseHHMM(t.end) <= now;
              const live = !done && parseHHMM(t.start) <= now;
              if (!t.courseCode)
                return (
                  <View key={t.start} style={[s.plate, { width: 104, padding: 10, justifyContent: "space-between", minHeight: 150 }]}>
                    <Text style={s.monoMuted}>{t.start}</Text>
                    <Text style={[s.title, { fontFamily: "PlayfairDisplay_600SemiBold_Italic", color: c.ink2 }]}>{t.kind === "LUNCH" ? "Lunch" : "Break"}</Text>
                    <Text style={s.label}>{parseHHMM(t.end) - parseHHMM(t.start)} min</Text>
                  </View>
                );
              return (
                <View key={t.start + t.courseCode} style={[s.folio, { width: 176, padding: 12, gap: 6, minHeight: 150, opacity: done || t.cancelled ? 0.6 : 1 }, live && { borderWidth: 2, borderColor: c.accentFill }]}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={[s.mono, { fontFamily: F.monoBold }]}>{t.start}–{t.end}</Text>
                    {t.cancelled ? <Tag tone="bad">Cancelled</Tag> : t.extra ? <Tag tone="ink">Extra</Tag> : live ? <Tag tone="warn">Now</Tag> : done ? <Tag>Done</Tag> : null}
                  </View>
                  <Text style={[s.headline, info(t.courseCode).activity ? { fontSize: 17, fontFamily: "PlayfairDisplay_600SemiBold_Italic", color: c.ink2 } : { fontSize: 21 }, t.cancelled && { textDecorationLine: "line-through" }]}>{info(t.courseCode).short}</Text>
                  <Text style={s.body2} numberOfLines={2}>{info(t.courseCode).activity ? "Non-credit session" : name(t.courseCode)}</Text>
                  {t.room && <Text style={[s.monoMuted, { marginTop: "auto" }]}>{t.room}</Text>}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View>
        <SectionHead index="02" title="Coming up" />
        {coming.length === 0 ? <Empty>Nothing in the next two weeks.</Empty> : (
          <View style={s.folio}>
            {coming.map((x, i) => (
              <View key={x.id} style={[s.row, { padding: 12 }, i > 0 && s.divider]}>
                <View style={{ width: 44, alignItems: "center" }}>
                  <Text style={[s.num, { fontSize: 22 }]}>{+x.date.slice(8)}</Text>
                  <Text style={[s.label, { fontSize: 8 }]}>{prettyDate(x.date).split(" ")[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.body, x.cancelled && { textDecorationLine: "line-through", color: c.muted }]}>{x.title}</Text>
                  <Text style={s.monoMuted}>{x.sub}</Text>
                </View>
                <Tag tone={x.cancelled ? "bad" : x.tone}>{x.cancelled ? "Cancelled" : x.tag}</Tag>
              </View>
            ))}
          </View>
        )}
      </View>

      {plan.length > 0 && (
        <View>
          <SectionHead index="03" title="Study plan" />
          <View style={[s.plate, { padding: 14, gap: 10 }]}>
            {plan.map((x) => (
              <View key={x.date + x.start} style={s.row}>
                <Text style={[s.mono, { width: 92 }]}>{x.date === today ? "Today" : "Tmrw"} {x.start}</Text>
                <Text style={[s.body, { flex: 1 }]}>{x.title}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View>
        <SectionHead index={plan.length ? "04" : "03"} title="Attendance" right={
          <Pressable onPress={() => go("attendance")} accessibilityRole="link" hitSlop={10} style={{ paddingVertical: 8 }}>
            <Text style={[s.mono, { textDecorationLine: "underline", textDecorationColor: c.accentFill }]}>Details</Text>
          </Pressable>
        } />
        <View style={s.folio}>
          <View style={[s.row, { padding: 14, justifyContent: "space-between" }]}>
            <Text style={[s.num, { fontSize: 34 }]}>{pct(o.present, o.held).toFixed(1)}<Text style={{ color: c.accent, fontSize: 18 }}>%</Text></Text>
            <Text style={s.monoMuted}>{o.present}/{o.held} · min {Math.round(min * 100)}%</Text>
          </View>
          {[...b.stats].sort((a, x) => a.name.localeCompare(x.name)).map((x) => {
            const p = pct(x.present, x.held);
            return (
              <View key={x.code} style={[s.row, s.divider, { paddingHorizontal: 14, paddingVertical: 11 }]}>
                <Dot color={statusColor(c, attendanceStatus(p, min))} />
                <Text style={[s.mono, { fontFamily: F.monoBold, flex: 1 }]}>{shortName(x.name)}</Text>
                <Text style={[s.num, { fontSize: 14 }]}>{pctText(p)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
