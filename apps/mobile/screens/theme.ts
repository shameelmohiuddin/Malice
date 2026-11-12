import { StyleSheet } from "react-native";
export const C = { bg: "#f7f7f5", card: "#ffffff", ink: "#18181b", muted: "#6b6b73", line: "#e7e5e4", accent: "#2f5bea", safe: "#059669", risky: "#d97706", must: "#e11d48" };
export const ADV = { safe: { label: "ok to skip", color: C.safe }, risky: { label: "risky", color: C.risky }, must: { label: "don't skip", color: C.must } } as const;
export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  label: { fontSize: 11, fontWeight: "700", color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" },
  h1: { fontSize: 24, fontWeight: "800", color: C.ink },
  muted: { color: C.muted, fontSize: 13 },
  input: { borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: C.card, fontSize: 15 },
  btn: { backgroundColor: C.accent, borderRadius: 10, padding: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700" },
});
export const pctText = (n: number) => `${n.toFixed(1)}%`;
