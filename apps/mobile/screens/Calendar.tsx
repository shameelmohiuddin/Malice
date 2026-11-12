import { ScrollView, Text, View } from "react-native";
import { prettyDate, todayIST } from "@classpilot/core";
import type { Bundle } from "../lib/sync";
import { C, s } from "./theme";

export function Calendar({ b }: { b: Bundle }) {
  const today = todayIST();
  const items = [
    ...b.events.map((e) => ({ id: e.id, date: e.start, title: e.title, color: e.isHoliday ? C.safe : C.accent, cancelled: e.cancelled })),
    ...b.deadlines.map((d) => ({ id: d.id, date: d.due, title: `${d.title} (${d.kind})`, color: C.must, cancelled: false })),
  ].filter((i) => i.date >= today).sort((a, x) => (a.date < x.date ? -1 : 1));
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={[s.h1, { marginBottom: 12 }]}>Upcoming</Text>
      <View style={s.card}>
        {items.length === 0 && <Text style={s.muted}>Nothing coming up.</Text>}
        {items.map((i) => (
          <View key={i.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i.color }} />
            <Text style={[s.muted, { width: 90 }]}>{prettyDate(i.date)}</Text>
            <Text style={{ flex: 1, color: i.cancelled ? C.muted : C.ink, textDecorationLine: i.cancelled ? "line-through" : "none" }}>{i.title}{i.cancelled ? " · Cancelled" : ""}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
