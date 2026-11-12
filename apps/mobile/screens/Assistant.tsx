import { useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ask, HELP, isClassroomUrl, nowMinutesIST, todayIST } from "@bunk/core";
import type { Bundle } from "../lib/sync";
import { C, s } from "./theme";

type Msg = { me: boolean; text: string; options?: string[]; retry?: string };
const TABS: Record<string, string> = { "/dashboard": "home", "/timetable": "timetable", "/calendar": "calendar", "/planner": "calendar", "/settings": "home" };

export function Assistant({ b, go }: { b: Bundle; go: (tab: string) => void }) {
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ me: false, text: "Ask me about attendance, skips, classes or events. Works offline.", options: HELP.slice(0, 4) }]);
  const ref = useRef<any>(null);
  const send = (q: string) => {
    if (!q.trim()) return;
    const r = ask(q, b, todayIST(), nowMinutesIST());
    const retry = r.options && /which|pick/i.test(r.text) ? q : undefined;
    setMsgs((m) => [...m, { me: true, text: q }, { me: false, text: r.text, options: r.options, retry }]);
    setText("");
    if (r.navigate && TABS[r.navigate]) go(TABS[r.navigate]);
    if (r.openUrl && isClassroomUrl(r.openUrl)) Linking.openURL(r.openUrl);
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={ref} onContentSizeChange={() => ref.current?.scrollToEnd()} contentContainerStyle={{ padding: 16, gap: 8 }}>
        {msgs.map((m, i) => (
          <View key={i} style={{ alignItems: m.me ? "flex-end" : "flex-start" }}>
            <Text style={{ backgroundColor: m.me ? C.accent : C.card, color: m.me ? "white" : C.ink, borderColor: C.line, borderWidth: m.me ? 0 : 1, padding: 10, borderRadius: 14, maxWidth: "90%", overflow: "hidden" }}>{m.text}</Text>
            {m.options && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {m.options.map((o) => (
                  <Pressable key={o} onPress={() => send(m.retry ? `${m.retry} ${o}` : o)} style={{ borderColor: C.line, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.card }}>
                    <Text style={{ fontSize: 12, color: C.ink }}>{o}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: C.line }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={() => send(text)} placeholder="e.g. can I skip tomorrow?" style={[s.input, { flex: 1 }]} returnKeyType="send" />
        <Pressable onPress={() => send(text)} style={[s.btn, { justifyContent: "center" }]}><Text style={s.btnText}>Ask</Text></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
