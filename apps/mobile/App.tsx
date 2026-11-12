import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import NetInfo from "@react-native-community/netinfo";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { loadBundle, syncDown, type Bundle } from "./lib/sync";
import { clearCache } from "./lib/db";
import { Home } from "./screens/Home";
import { Timetable } from "./screens/Timetable";
import { Calendar } from "./screens/Calendar";
import { Assistant } from "./screens/Assistant";
import { C, s } from "./screens/theme";

const TABS = [["home", "Home"], ["timetable", "Timetable"], ["calendar", "Calendar"], ["assistant", "Assistant"]] as const;

function Login() {
  const [email, setEmail] = useState("student1@demo.bunk");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message);
  };
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 34, fontWeight: "800", color: C.ink }}>Bunk<Text style={{ color: C.accent }}>Smart</Text></Text>
      <Text style={s.muted}>Know exactly when you can skip, and when you can't.</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" style={s.input} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" style={s.input} />
      {err && <Text style={{ color: C.must }}>{err}</Text>}
      <Pressable onPress={go} style={s.btn} disabled={busy}><Text style={s.btnText}>{busy ? "Logging in…" : "Log in"}</Text></Pressable>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState("home");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s2) => setSession(s2));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    const c = await loadBundle();
    if (c) { setBundle(c.value); setUpdatedAt(c.updatedAt); }
  }, []);

  const sync = useCallback(async () => {
    if (!session) return;
    setSyncing(true);
    try { await syncDown(session.user.id); setSyncError(null); }
    catch (e) { setSyncError((e as Error).message || "Couldn't reach the server"); /* keep cached data */ }
    await refresh();
    setSyncing(false);
  }, [session, refresh]);

  useEffect(() => { if (session) { refresh(); sync(); } }, [session, refresh, sync]);
  useEffect(() => NetInfo.addEventListener((st) => {
    const on = !!st.isConnected && st.isInternetReachable !== false;
    setOnline((was) => { if (on && !was) sync(); return on; });
  }), [sync]);

  if (session === undefined) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator /></View>;
  const time = updatedAt ? new Date(updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "never";

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="dark" />
        {!session ? <Login /> : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
              <Text style={{ fontWeight: "800", fontSize: 18, color: C.ink, flex: 1 }}>Bunk<Text style={{ color: C.accent }}>Smart</Text></Text>
              <Pressable onPress={sync}><Text style={s.muted}>{syncing ? "Syncing…" : "Sync"}</Text></Pressable>
              <Pressable onPress={async () => { await clearCache(); setBundle(null); await supabase.auth.signOut(); }} style={{ marginLeft: 14 }}><Text style={s.muted}>Log out</Text></Pressable>
            </View>
            {!online && <Text style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: 8, textAlign: "center", fontWeight: "600" }}>Offline · last synced {time}</Text>}
            <View style={{ flex: 1 }}>
              {!bundle ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 }}>
                  {syncing || !syncError ? <><ActivityIndicator /><Text style={s.muted}>Loading your data…</Text></> : <>
                    <Text style={{ color: C.must, textAlign: "center" }}>Couldn't load your data. Connect to the internet once to sync.{"\n"}{syncError}</Text>
                    <Pressable onPress={sync} style={s.btn}><Text style={s.btnText}>Retry</Text></Pressable>
                  </>}
                </View>
              )
                : tab === "home" ? <Home b={bundle} />
                : tab === "timetable" ? <Timetable b={bundle} />
                : tab === "calendar" ? <Calendar b={bundle} />
                : <Assistant b={bundle} go={setTab} />}
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
              {TABS.map(([k, l]) => (
                <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ color: tab === k ? C.accent : C.muted, fontWeight: tab === k ? "800" : "500" }}>{l}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
