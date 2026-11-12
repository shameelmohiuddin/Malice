import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { attendanceStatus, type AttendanceStatus } from "@classpilot/core";

// Same editorial system as the web app: parchment + carbon ink, bronze accent, earth-tone status, sharp corners.
const LIGHT = { bg: "#f8f5ee", panel: "#efece3", card: "#fcfaf5", ink: "#161412", ink2: "#4c4640", muted: "#7d766f", line: "rgba(22,20,18,0.16)", lineStrong: "rgba(22,20,18,0.7)", accent: "#8a6420", accentFill: "#c99e5c", ok: "#4e825a", warn: "#9a6a12", bad: "#b85347", onAccent: "#161412" };
const DARK = { bg: "#121110", panel: "#1a1918", card: "#1f1d1b", ink: "#f5f1e8", ink2: "#cfc8bb", muted: "#9a9286", line: "rgba(245,241,232,0.14)", lineStrong: "rgba(245,241,232,0.6)", accent: "#d4a366", accentFill: "#d4a366", ok: "#62996e", warn: "#d4a366", bad: "#d1675b", onAccent: "#121110" };
export type Palette = typeof LIGHT;

export const F = {
  display: "PlayfairDisplay_700Bold", displayItalic: "PlayfairDisplay_700Bold_Italic", headline: "PlayfairDisplay_600SemiBold",
  serif: "Newsreader_400Regular", serifItalic: "Newsreader_400Regular_Italic", serifBold: "Newsreader_600SemiBold",
  mono: "SpaceMono_400Regular", monoBold: "SpaceMono_700Bold",
};

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { padding: 20, paddingBottom: 48, gap: 28 },
  display: { fontFamily: F.display, fontSize: 38, lineHeight: 42, color: c.ink, letterSpacing: -0.6 },
  headline: { fontFamily: F.headline, fontSize: 24, lineHeight: 30, color: c.ink },
  title: { fontFamily: F.headline, fontSize: 19, lineHeight: 24, color: c.ink },
  body: { fontFamily: F.serif, fontSize: 16, lineHeight: 23, color: c.ink },
  body2: { fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: c.ink2 },
  italic: { fontFamily: F.serifItalic, fontSize: 15, color: c.ink2 },
  label: { fontFamily: F.monoBold, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: c.muted },
  mono: { fontFamily: F.mono, fontSize: 12, color: c.ink },
  monoMuted: { fontFamily: F.mono, fontSize: 11, color: c.muted },
  num: { fontFamily: F.monoBold, color: c.ink, letterSpacing: -0.5 },
  folio: { backgroundColor: c.card, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line },
  plate: { backgroundColor: c.panel, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line },
  band: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line },
  btn: { minHeight: 46, paddingHorizontal: 18, backgroundColor: c.ink, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.ink },
  btnText: { fontFamily: F.monoBold, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: c.bg },
  btnLine: { minHeight: 44, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.lineStrong },
  btnLineText: { fontFamily: F.monoBold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: c.ink },
  input: { minHeight: 46, borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.card, paddingHorizontal: 12, fontFamily: F.serif, fontSize: 16, color: c.ink },
  tag: { borderWidth: 1, borderColor: c.line, paddingHorizontal: 6, paddingVertical: 3, alignSelf: "flex-start" },
  tagText: { fontFamily: F.monoBold, fontSize: 9, letterSpacing: 1.3, textTransform: "uppercase", color: c.ink2 },
});
export type Styles = ReturnType<typeof makeStyles>;

type Theme = { c: Palette; s: Styles; dark: boolean; toggle: () => void };
const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<"light" | "dark" | null>(null);
  useEffect(() => { AsyncStorage.getItem("cp-theme").then((v) => { if (v === "light" || v === "dark") setOverride(v); }); }, []);
  const dark = (override ?? system) === "dark";
  const value = useMemo<Theme>(() => {
    const c = dark ? DARK : LIGHT;
    return { c, s: makeStyles(c), dark, toggle: () => { const next = dark ? "light" : "dark"; setOverride(next); AsyncStorage.setItem("cp-theme", next); } };
  }, [dark]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => {
  const t = useContext(Ctx);
  if (!t) throw new Error("useTheme outside ThemeProvider");
  return t;
};

export const pctText = (n: number) => `${n.toFixed(1)}%`;
export const statusColor = (c: Palette, st: AttendanceStatus) => (st === "below" ? c.bad : st === "close" ? c.warn : c.ok);
export const STATUS_LABEL: Record<AttendanceStatus, string> = { clear: "Clear", close: "Close to minimum", below: "Below minimum" };
export { attendanceStatus };
