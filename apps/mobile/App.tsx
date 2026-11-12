import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import NetInfo from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
// Per-weight imports so only the 9 faces used are bundled.
import { PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display/600SemiBold";
import { PlayfairDisplay_600SemiBold_Italic } from "@expo-google-fonts/playfair-display/600SemiBold_Italic";
import { PlayfairDisplay_700Bold } from "@expo-google-fonts/playfair-display/700Bold";
import { PlayfairDisplay_700Bold_Italic } from "@expo-google-fonts/playfair-display/700Bold_Italic";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader/400Regular";
import { Newsreader_400Regular_Italic } from "@expo-google-fonts/newsreader/400Regular_Italic";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";
import { SpaceMono_400Regular } from "@expo-google-fonts/space-mono/400Regular";
import { SpaceMono_700Bold } from "@expo-google-fonts/space-mono/700Bold";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { loadBundle, syncDown, type Bundle } from "./lib/sync";
import { clearCache } from "./lib/db";
import { Today } from "./screens/Today";
import { Timetable } from "./screens/Timetable";
import { Calendar } from "./screens/Calendar";
import { Attendance } from "./screens/Attendance";
import { Assistant } from "./screens/Assistant";
import { F, ThemeProvider, useTheme } from "./screens/theme";

const TABS = [["today", "Today"], ["timetable", "Week"], ["calendar", "Calendar"], ["attendance", "Attendance"], ["assistant", "Ask"]] as const;

/** The ClassPilot web server. The ERP check runs there: the APK never holds the keys it needs. */
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

function Login() {
  const { c, s } = useTheme();
  // Students log in with their MITE ERP account (like the web app); email accounts are for staff and demos.
  const [mode, setMode] = useState<"erp" | "email">("erp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      if (mode === "email") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setErr(error.message);
        return;
      }
      if (!API_URL) { setErr("This build has no server address, so ERP login is unavailable."); return; }
      const res = await fetch(`${API_URL}/api/v1/auth/erp`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: email.trim(), password }),
      });
      const j = await res.json().catch(() => null);
      if (!j?.ok) { setErr(j?.message ?? "Couldn't reach ClassPilot. Check your connection."); return; }
      const { error } = await supabase.auth.setSession(j.data);
      if (error) setErr(error.message);
    } catch {
      setErr("Couldn't reach ClassPilot. Check your connection.");
    } finally {
      setBusy(false);
    }
  };
  const erp = mode === "erp";
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 18 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <Text style={[s.label, { color: c.accent }]}>MITE · from your ERP</Text>
        <Text style={[s.display, { fontSize: 44, lineHeight: 48 }]}>Class<Text style={{ fontFamily: F.displayItalic }}>Pilot</Text></Text>
        <Text style={s.body2}>{erp ? "Log in with your MITE ERP account. ClassPilot checks it with the ERP and brings in your attendance and timetable." : "Staff and demo accounts."}</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>{erp ? "USN or college email" : "Email"}</Text>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize={erp ? "characters" : "none"} autoCorrect={false} keyboardType={erp ? "default" : "email-address"} autoComplete={erp ? "username" : "email"} style={s.input} accessibilityLabel={erp ? "USN or college email" : "Email"} placeholderTextColor={c.muted} />
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={s.label}>{erp ? "ERP password" : "Password"}</Text>
          <Pressable onPress={() => setShow(!show)} hitSlop={12} accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"}>
            <Text style={[s.label, { color: c.accent }]}>{show ? "Hide" : "Show"}</Text>
          </Pressable>
        </View>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" style={s.input} accessibilityLabel={erp ? "ERP password" : "Password"} />
      </View>
      {err && <Text style={[s.body, { color: c.bad }]} accessibilityRole="alert">{err}</Text>}
      <Pressable onPress={go} style={[s.btn, busy && { opacity: 0.6 }]} disabled={busy} accessibilityRole="button">
        <Text style={s.btnText}>{busy ? (erp ? "Checking with the ERP…" : "Logging in…") : erp ? "Log in with MITE ERP" : "Log in"}</Text>
      </Pressable>
      <Pressable onPress={() => { setMode(erp ? "email" : "erp"); setErr(null); }} hitSlop={8} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={[s.label, { color: c.accent }]}>{erp ? "Staff or demo account" : "Student? Log in with MITE ERP"}</Text>
      </Pressable>
    </View>
  );
}

function Shell() {
  const { c, s, dark, toggle } = useTheme();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState("today");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s2) => setSession(s2));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const cached = await loadBundle();
    if (cached) { setBundle(cached.value); setUpdatedAt(cached.updatedAt); }
  }, []);
  const sync = useCallback(async () => {
    if (!session) return;
    setSyncing(true);
    try { await syncDown(session.user.id); setSyncError(null); }
    catch (e) { setSyncError((e as Error).message || "Couldn't reach the server"); }
    await refresh();
    setSyncing(false);
  }, [session, refresh]);

  useEffect(() => { if (session) { refresh(); sync(); } }, [session, refresh, sync]);
  useEffect(() => NetInfo.addEventListener((st) => {
    const on = !!st.isConnected && st.isInternetReachable !== false;
    setOnline((was) => { if (on && !was) sync(); return on; });
  }), [sync]);

  const time = updatedAt ? new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "never";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 60, borderBottomWidth: 1, borderColor: c.line, gap: 4 }}>
        <Text style={[s.headline, { fontSize: 21, flex: 1 }]}>ClassPilot</Text>
        <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={dark ? "Switch to light mode" : "Switch to dark mode"} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 17, color: c.ink2 }}>{dark ? "☀" : "☾"}</Text>
        </Pressable>
        {session && (
          <>
            <Pressable onPress={sync} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
              <Text style={[s.mono, { color: c.ink2 }]}>{syncing ? "Syncing…" : "Sync"}</Text>
            </Pressable>
            <Pressable onPress={async () => { await clearCache(); setBundle(null); await supabase.auth.signOut(); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", paddingLeft: 8 }}>
              <Text style={[s.mono, { color: c.ink2, textDecorationLine: "underline", textDecorationColor: c.accentFill }]}>Log out</Text>
            </Pressable>
          </>
        )}
      </View>

      {session === undefined ? <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator color={c.accentFill} /></View>
        : !session ? <Login /> : (
          <>
            {!online && (
              <View style={{ backgroundColor: c.panel, borderBottomWidth: 1, borderColor: c.line, paddingVertical: 8, paddingHorizontal: 20 }}>
                <Text style={[s.label, { color: c.warn }]}>Offline · last synced {time}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {!bundle ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 }}>
                  {syncing || !syncError ? <><ActivityIndicator color={c.accentFill} /><Text style={s.italic}>Loading your data…</Text></> : <>
                    <Text style={[s.body, { color: c.bad, textAlign: "center" }]}>Couldn't load your data. Connect to the internet once to sync.{"\n"}{syncError}</Text>
                    <Pressable onPress={sync} style={s.btn} accessibilityRole="button"><Text style={s.btnText}>Retry</Text></Pressable>
                  </>}
                </View>
              ) : tab === "today" ? <Today b={bundle} go={setTab} />
                : tab === "timetable" ? <Timetable b={bundle} />
                : tab === "calendar" ? <Calendar b={bundle} />
                : tab === "attendance" ? <Attendance b={bundle} />
                : <Assistant b={bundle} go={setTab} />}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: c.lineStrong, backgroundColor: c.bg }} accessibilityRole="tablist">
              {TABS.map(([k, l]) => {
                const active = tab === k;
                return (
                  <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: active }}
                    style={{ flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", borderTopWidth: 2, borderColor: active ? c.accentFill : "transparent", backgroundColor: active ? c.panel : "transparent" }}>
                    <Text style={{ fontFamily: active ? F.monoBold : F.mono, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: active ? c.ink : c.muted }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded] = useFonts({
    PlayfairDisplay_600SemiBold, PlayfairDisplay_600SemiBold_Italic, PlayfairDisplay_700Bold, PlayfairDisplay_700Bold_Italic,
    Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_600SemiBold,
    SpaceMono_400Regular, SpaceMono_700Bold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
