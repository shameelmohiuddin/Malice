import { useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ask, HELP, isClassroomUrl, nowMinutesIST, todayIST } from "@classpilot/core";
import type { Bundle } from "../lib/sync";
import { F, useTheme } from "./theme";

type Msg = { me: boolean; text: string; options?: string[]; retry?: string };
const TABS: Record<string, string> = { "/dashboard": "today", "/timetable": "timetable", "/calendar": "calendar", "/planner": "today", "/settings": "today" };

export function Assistant({ b, go }: { b: Bundle; go: (tab: string) => void }) {
  const { c, s } = useTheme();
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ me: false, text: "Ask about your classes, attendance, deadlines or events. Works offline.", options: HELP.slice(0, 4) }]);
  const ref = useRef<any>(null);
  const send = (q: string) => {
    if (!q.trim()) return;
    const r = ask(q, { ...b, min: Number(b.profile.min_attendance ?? 0.75), instructors: Object.fromEntries(Object.entries(b.catalog ?? {}).flatMap(([k, c]) => (c.instructor ? [[k, c.instructor]] : []))) }, todayIST(), nowMinutesIST());
    const retry = r.options && /which|pick/i.test(r.text) ? q : undefined;
    setMsgs((m) => [...m, { me: true, text: q }, { me: false, text: r.text, options: r.options, retry }]);
    setText("");
    if (r.navigate && TABS[r.navigate]) go(TABS[r.navigate]);
    if (r.openUrl && isClassroomUrl(r.openUrl)) Linking.openURL(r.openUrl);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 6 }}>
        <Text style={s.label}>ClassPilot AI · on your phone</Text>
        <Text style={s.display} accessibilityRole="header">Ask</Text>
      </View>
      <ScrollView ref={ref} onContentSizeChange={() => ref.current?.scrollToEnd()} contentContainerStyle={{ padding: 20, gap: 10 }}>
        {msgs.map((m, i) => (
          <View key={i} style={{ alignItems: m.me ? "flex-end" : "flex-start", gap: 8 }}>
            <View style={[{ maxWidth: "90%", paddingHorizontal: 12, paddingVertical: 9 }, m.me ? { backgroundColor: c.ink } : s.plate]}>
              <Text style={[s.body, m.me && { color: c.bg }]}>{m.text}</Text>
            </View>
            {m.options && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {m.options.map((o) => (
                  <Pressable key={o} accessibilityRole="button" onPress={() => send(m.retry ? `${m.retry} ${o}` : o)} style={[s.tag, { minHeight: 34, justifyContent: "center", backgroundColor: c.card }]}>
                    <Text style={[s.tagText, { fontFamily: F.mono, letterSpacing: 0.4, textTransform: "none", fontSize: 12, color: c.ink }]}>{o}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.bg }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send(text)} placeholder="When is my next lab?" placeholderTextColor={c.muted}
          style={[s.input, { flex: 1 }]} returnKeyType="send" accessibilityLabel="Question" />
        <Pressable onPress={() => send(text)} style={s.btn} accessibilityRole="button"><Text style={s.btnText}>Ask</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
