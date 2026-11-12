import { Linking, Pressable, Text, View } from "react-native";
import { isClassroomUrl } from "@classpilot/core";
import { useTheme } from "./theme";

type TagTone = "plain" | "ink" | "ok" | "warn" | "bad";
export function Tag({ children, tone = "plain" }: { children: string; tone?: TagTone }) {
  const { c, s } = useTheme();
  const color = tone === "ok" ? c.ok : tone === "warn" ? c.warn : tone === "bad" ? c.bad : tone === "ink" ? c.bg : c.ink2;
  const border = tone === "ok" ? c.ok : tone === "warn" ? c.warn : tone === "bad" ? c.bad : tone === "ink" ? c.ink : c.line;
  return (
    <View style={[s.tag, { borderColor: border, backgroundColor: tone === "ink" ? c.ink : "transparent" }]}>
      <Text style={[s.tagText, { color }]}>{children}</Text>
    </View>
  );
}

/** Mono index chip + display heading, like the web sections. */
export function SectionHead({ index, title, right }: { index: string; title: string; right?: React.ReactNode }) {
  const { s } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
      <View style={{ gap: 6 }}>
        <Tag tone="ink">{index}</Tag>
        <Text style={s.headline} accessibilityRole="header">{title}</Text>
      </View>
      {right}
    </View>
  );
}

export function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, backgroundColor: color }} />;
}

export function ClassroomLink({ url }: { url?: string }) {
  const { c, s } = useTheme();
  if (!url || !isClassroomUrl(url)) return null;
  return (
    <Pressable onPress={() => Linking.openURL(url)} accessibilityRole="link" hitSlop={10} style={{ paddingVertical: 6 }}>
      <Text style={[s.mono, { textDecorationLine: "underline", textDecorationColor: c.accentFill }]}>Open in Classroom ↗</Text>
    </Pressable>
  );
}

export function Empty({ children }: { children: string }) {
  const { s } = useTheme();
  return <Text style={s.italic}>{children}</Text>;
}
