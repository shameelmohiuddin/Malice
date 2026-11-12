import { ScrollView, Text, View } from "react-native";
import { addDays, parseHHMM, prettyDate, todayIST } from "@classpilot/core";
import type { Bundle } from "../lib/sync";
import { C, s } from "./theme";

export function Timetable({ b }: { b: Bundle }) {
  const today = todayIST();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={[s.h1, { marginBottom: 12 }]}>Next 7 days</Text>
      {days.map((d) => {
        const slots = b.timetable.filter((t) => t.date === d && t.courseCode).sort((a, x) => parseHHMM(a.start) - parseHHMM(x.start));
        const ev = b.events.filter((e) => e.start <= d && e.end >= d);
        return (
          <View key={d} style={s.card}>
            <Text style={{ fontWeight: "700", color: C.ink, marginBottom: 6 }}>{prettyDate(d)}</Text>
            {ev.map((e) => <Text key={e.id} style={{ color: e.isHoliday ? C.safe : C.accent, marginBottom: 4, textDecorationLine: e.cancelled ? "line-through" : "none" }}>{e.title}</Text>)}
            {!slots.length && !ev.length && <Text style={s.muted}>No classes</Text>}
            {slots.map((t) => (
              <View key={t.start + t.courseCode} style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                <Text style={[s.muted, { width: 90 }]}>{t.start}–{t.end}</Text>
                <Text style={{ flex: 1, color: t.cancelled ? C.muted : C.ink, textDecorationLine: t.cancelled ? "line-through" : "none" }}>
                  {b.stats.find((x) => x.code === t.courseCode)?.name ?? t.courseCode}{t.extra ? "  · Extra" : ""}{t.cancelled ? "  · Cancelled" : ""}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
