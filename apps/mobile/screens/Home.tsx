import { ScrollView, Text, View, Linking, Pressable } from "react-native";
import { isClassroomUrl, classAdvice, costOfMiss, mustAttend, overall, pct, projection, safeToMiss, parseHHMM, prettyDate, todayIST } from "@bunk/core";
import type { Bundle } from "../lib/sync";
import { ADV, C, pctText, s } from "./theme";

export function Home({ b }: { b: Bundle }) {
  const min = Number(b.profile.min_attendance ?? 0.75);
  const today = todayIST();
  const o = overall(b.stats);
  const due = (code: string) => b.deadlines.some((d) => d.due === today && d.courseCode === code);
  const todays = b.timetable.filter((t) => t.date === today && t.courseCode).sort((a, x) => parseHHMM(a.start) - parseHHMM(x.start));
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={s.label}>Overall attendance</Text>
      <Text style={{ fontSize: 44, fontWeight: "800", color: C.ink }}>{pctText(pct(o.present, o.held))}</Text>
      <Text style={[s.muted, { marginBottom: 14 }]}>{o.present}/{o.held} classes</Text>
      <View style={s.card}>
        <Text style={[s.label, { marginBottom: 8 }]}>Today · {prettyDate(today)}</Text>
        {todays.length === 0 && <Text style={s.muted}>No classes today.</Text>}
        {todays.map((t) => {
          const st = b.stats.find((x) => x.code === t.courseCode);
          const a = st ? ADV[classAdvice(st, due(st.code), min)] : null;
          return (
            <View key={t.start + t.courseCode} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 }}>
              <Text style={[s.muted, { width: 48 }]}>{t.start}</Text>
              <Text style={{ flex: 1, color: C.ink, textDecorationLine: t.cancelled ? "line-through" : "none" }} numberOfLines={1}>{st?.name ?? t.courseCode}</Text>
              {t.cancelled ? <Text style={s.muted}>Cancelled</Text> : a && <Text style={{ color: a.color, fontWeight: "700", fontSize: 12 }}>{a.label}</Text>}
            </View>
          );
        })}
      </View>
      {[...b.stats].sort((a, x) => pct(a.present, a.held) - pct(x.present, x.held)).map((st) => {
        const a = ADV[classAdvice(st, due(st.code), min)];
        const skip = safeToMiss(st.present, st.held, min);
        const need = mustAttend(st.present, st.held, min);
        const c = costOfMiss(st.present, st.held);
        const pr = projection(st, min);
        return (
          <View key={st.code} style={[s.card, { borderLeftWidth: 4, borderLeftColor: a.color }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "700", color: C.ink, flex: 1 }} numberOfLines={1}>{st.name}</Text>
              <Text style={{ color: a.color, fontWeight: "700", fontSize: 12 }}>{a.label}</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: C.ink }}>{pctText(pct(st.present, st.held))} <Text style={s.muted}>{st.present}/{st.held}</Text></Text>
            <Text style={{ color: skip > 0 ? C.safe : C.must, fontWeight: "700" }}>
              {skip > 0 ? `Can skip ${skip} more` : need > 0 ? `Attend the next ${need} to reach ${min * 100}%` : "Can't skip any more"}
            </Text>
            <Text style={s.muted}>Skip next: {pctText(c.before)} → {pctText(c.after)} (−{c.drop.toFixed(1)}%)</Text>
            <Text style={s.muted}>By semester end: can miss {pr.canMissRemaining} of {pr.remaining} left</Text>
            {isClassroomUrl(b.classroom[st.code]) && <Pressable onPress={() => Linking.openURL(b.classroom[st.code])}><Text style={{ color: C.accent, fontWeight: "700", marginTop: 4 }}>Open in Classroom ↗</Text></Pressable>}
          </View>
        );
      })}
    </ScrollView>
  );
}
