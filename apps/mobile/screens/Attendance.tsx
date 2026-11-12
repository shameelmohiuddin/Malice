import { ScrollView, Text, View } from "react-native";
import { courseView, overall, pct, shortName } from "@classpilot/core";
import type { Bundle } from "../lib/sync";
import { ClassroomLink, Tag } from "./parts";
import { attendanceStatus, F, pctText, STATUS_LABEL, useTheme } from "./theme";

export function Attendance({ b }: { b: Bundle }) {
  const { c, s } = useTheme();
  const min = Number(b.profile.min_attendance ?? 0.75);
  const o = overall(b.stats);
  const views = [...b.stats].sort((a, x) => a.name.localeCompare(x.name)).map((x) => courseView(x, { min, deadlineToday: false }));
  const tone = { clear: "ok", close: "warn", below: "bad" } as const;
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>From the ERP · minimum {Math.round(min * 100)}%</Text>
        <Text style={s.display} accessibilityRole="header">Attendance</Text>
        <Text style={s.body2}>Overall {pct(o.present, o.held).toFixed(1)}% · {o.present}/{o.held} classes</Text>
      </View>
      {views.map((v) => {
        const st = attendanceStatus(v.percent, min);
        return (
          <View key={v.code} style={[s.folio, { padding: 16, gap: 12 }]}>
            <View style={s.band}><Text style={s.monoMuted}>{v.code}</Text><Tag tone={tone[st]}>{STATUS_LABEL[st]}</Tag></View>
            <View>
              <Text style={[s.display, { fontSize: 30, lineHeight: 34 }]}>{shortName(v.name)}</Text>
              <Text style={s.body2}>{v.name}</Text>
            </View>
            <View style={[s.plate, s.row, { padding: 12, justifyContent: "space-between", alignItems: "flex-end" }]}>
              <Text style={[s.num, { fontSize: 30 }]}>{v.percent.toFixed(1)}<Text style={{ color: c.accent, fontSize: 16 }}>%</Text></Text>
              <Text style={s.mono}>{v.present} / {v.held}</Text>
            </View>
            {[
              ["One more absence", `${pctText(v.skipNext.before)} → ${pctText(v.skipNext.after)}`, v.skipNext.after < min * 100],
              ["Classes left", String(v.semester.remaining), false],
            ].map(([k, val, bad]) => (
              <View key={String(k)} style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.monoMuted}>{k}</Text>
                <Text style={[s.mono, bad ? { color: c.bad, fontFamily: F.monoBold } : null]}>{val}</Text>
              </View>
            ))}
            <ClassroomLink url={b.classroom[v.code]} />
          </View>
        );
      })}
    </ScrollView>
  );
}
