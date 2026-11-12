import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { addDays, parseHHMM, prettyDate, shortName, todayIST, weekday } from "@classpilot/core";
import { describe, type Bundle } from "../lib/sync";
import { Empty, Tag } from "./parts";
import { F, useTheme } from "./theme";

export function Timetable({ b }: { b: Bundle }) {
  const { c, s } = useTheme();
  const today = todayIST();
  const [offset, setOffset] = useState(0);
  const monday = addDays(addDays(today, -((weekday(today) + 6) % 7)), offset * 7);
  const days = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const info = (code: string | null) => describe(b, code);
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Week of {prettyDate(monday)}</Text>
        <Text style={s.display} accessibilityRole="header">Timetable</Text>
      </View>
      <View style={[s.row, { gap: 8 }]}>
        {[["←", -1, "Previous week"], ["This week", 0, "This week"], ["→", 1, "Next week"]].map(([label, d, a]) => (
          <Pressable key={String(a)} accessibilityRole="button" accessibilityLabel={String(a)} onPress={() => setOffset(d === 0 ? 0 : offset + (d as number))} style={[s.btnLine, { flex: d === 0 ? 2 : 1 }]}>
            <Text style={s.btnLineText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {days.map((day) => {
        const slots = b.timetable.filter((t) => t.date === day && t.courseCode).sort((a, x) => parseHHMM(a.start) - parseHHMM(x.start));
        const ev = b.events.filter((e) => e.start <= day && e.end >= day);
        const isToday = day === today;
        return (
          <View key={day} style={[s.folio, isToday && { borderWidth: 2, borderColor: c.accentFill }]}>
            <View style={[s.band, { padding: 14, paddingBottom: 10 }]}>
              <Text style={s.title}>{prettyDate(day)}</Text>
              {isToday ? <Tag tone="ink">Today</Tag> : <Text style={s.label}>{slots.filter((t) => !info(t.courseCode).activity).length} {slots.filter((t) => !info(t.courseCode).activity).length === 1 ? "class" : "classes"}</Text>}
            </View>
            {ev.map((e) => <Text key={e.id} style={[s.body2, { paddingHorizontal: 14, paddingTop: 8, color: e.isHoliday ? c.ok : c.accent }, e.cancelled && { textDecorationLine: "line-through" }]}>{e.title}</Text>)}
            {slots.length === 0 ? <View style={{ padding: 14 }}><Empty>No classes</Empty></View> : slots.map((t, i) => (
              <View key={t.start + t.courseCode} style={[s.row, { paddingHorizontal: 14, paddingVertical: 11, opacity: t.cancelled ? 0.6 : 1 }, i > 0 && s.divider]}>
                <Text style={[s.mono, { width: 86 }]}>{t.start}–{t.end}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.body, info(t.courseCode).activity ? { fontFamily: F.serifItalic, color: c.ink2 } : { fontFamily: F.serifBold }, t.cancelled && { textDecorationLine: "line-through" }]}>{info(t.courseCode).short}</Text>
                  <Text style={s.body2} numberOfLines={1}>{info(t.courseCode).activity ? (info(t.courseCode).instructor ?? "Non-credit session") : info(t.courseCode).full}{t.kind === "LAB" ? " · Lab" : t.kind === "TUTORIAL" ? " · Tutorial" : ""}{t.room ? ` · ${t.room}` : ""}</Text>
                </View>
                {t.cancelled ? <Tag tone="bad">Cancelled</Tag> : t.extra ? <Tag tone="ink">Extra</Tag> : null}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
