import { ScrollView, Text, View } from "react-native";
import { prettyDate, shortName, todayIST } from "@classpilot/core";
import type { Bundle } from "../lib/sync";
import { Dot, Empty, Tag } from "./parts";
import { useTheme } from "./theme";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function Calendar({ b }: { b: Bundle }) {
  const { c, s } = useTheme();
  const today = todayIST();
  const name = (code: string | null) => b.stats.find((x) => x.code === code)?.name ?? "";
  const items = [
    ...b.events.map((e) => ({ id: e.id, start: e.start, end: e.end, title: e.title, color: e.isHoliday ? c.ok : c.accentFill, sub: e.category.toLowerCase(), cancelled: e.cancelled })),
    ...b.deadlines.map((d) => ({ id: d.id, start: d.due, end: d.due, title: d.title, color: c.bad, sub: `${d.kind}${d.courseCode ? ` · ${shortName(name(d.courseCode))}` : ""}`, cancelled: false })),
  ].filter((i) => i.end >= today).sort((a, x) => (a.start < x.start ? -1 : 1));
  const months = [...new Set(items.map((i) => (i.start < today ? today : i.start).slice(0, 7)))];
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Academic calendar</Text>
        <Text style={s.display} accessibilityRole="header">Calendar</Text>
        <View style={[s.row, { gap: 14, marginTop: 4 }]}>
          {[["holiday", c.ok], ["event", c.accentFill], ["deadline", c.bad]].map(([k, col]) => <View key={k} style={[s.row, { gap: 6 }]}><Dot color={col} /><Text style={s.monoMuted}>{k}</Text></View>)}
        </View>
      </View>
      {items.length === 0 && <Empty>Nothing coming up.</Empty>}
      {months.map((m) => (
        <View key={m} style={{ gap: 10 }}>
          <Text style={s.headline}>{MONTHS[+m.slice(5) - 1]} <Text style={{ color: c.ink2 }}>{m.slice(0, 4)}</Text></Text>
          <View style={s.folio}>
            {items.filter((i) => (i.start < today ? today : i.start).startsWith(m)).map((i, n) => (
              <View key={i.id} style={[s.row, { padding: 12, alignItems: "flex-start" }, n > 0 && s.divider]}>
                <View style={{ paddingTop: 6 }}><Dot color={i.color} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.body, i.cancelled && { textDecorationLine: "line-through", color: c.muted }]}>{i.title}</Text>
                  <Text style={s.monoMuted}>{i.end === i.start ? prettyDate(i.start) : `${prettyDate(i.start)} – ${prettyDate(i.end)}`} · {i.sub}</Text>
                </View>
                {i.cancelled && <Tag tone="bad">Cancelled</Tag>}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
