import { useEffect, useState } from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { User } from "@supabase/supabase-js";
import { AuthCard } from "./src/components/AuthCard";
import { BottomTabs, TabKey } from "./src/components/BottomTabs";
import { AppSettingsScreen } from "./src/screens/AppSettingsScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { CaptureScreen } from "./src/screens/CaptureScreen";
import { DevConsoleScreen } from "./src/screens/DevConsoleScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { buildWeeklyLetter } from "./src/lib/letter";
import { defaultState, loadAppState, saveAppState } from "./src/lib/storage";
import { getCurrentSession, signInWithGoogle, signOut, supabase } from "./src/lib/supabase";
import { AppThemeProvider, themePalettes } from "./src/lib/theme";
import { AppState, ColorTheme, EnergyColorMode, Entry } from "./src/types/domain";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(value: string | Date) {
  return startOfDay(value).toISOString().slice(0, 10);
}

function currentAppDate(state: AppState) {
  return state.testToday ? startOfDay(`${state.testToday}T00:00:00`) : startOfDay(new Date());
}

function nowForState(state: AppState) {
  if (!state.testToday) return new Date();
  const now = new Date();
  return new Date(`${state.testToday}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`);
}

function entryAt(entry: Entry) {
  return startOfDay(entry.createdAt).getTime();
}

function reconcileLetters(state: AppState, today = currentAppDate(state)): AppState {
  if (!state.entries.length) return { ...state, letters: [] };

  const sortedEntries = [...state.entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const firstInputDate = startOfDay(sortedEntries[0].createdAt);
  const validSendDates = new Set<string>();

  for (let sendDate = addDays(firstInputDate, 7); sendDate.getTime() <= today.getTime(); sendDate = addDays(sendDate, 7)) {
    validSendDates.add(dateKey(sendDate));
  }

  const generated = state.letters.filter((letter) => validSendDates.has(dateKey(letter.deliveredAt)) && letter.id === `letter-${dateKey(letter.deliveredAt)}`);
  const existingIds = new Set(generated.map((letter) => letter.id));

  for (let sendDate = addDays(firstInputDate, 7); sendDate.getTime() <= today.getTime(); sendDate = addDays(sendDate, 7)) {
    const periodStart = addDays(sendDate, -7);
    const periodEnd = sendDate;
    const id = `letter-${dateKey(sendDate)}`;
    if (existingIds.has(id)) continue;

    const periodEntries = sortedEntries.filter((entry) => {
      const time = entryAt(entry);
      return time >= periodStart.getTime() && time < periodEnd.getTime();
    });
    generated.push(buildWeeklyLetter(periodEntries, periodStart, sendDate, id));
    existingIds.add(id);
  }

  return {
    ...state,
    letters: generated.sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
  };
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("capture");
  const [state, setState] = useState<AppState>(defaultState);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarFocusDate, setCalendarFocusDate] = useState<string | undefined>();
  const letters = state.letters;
  const theme = themePalettes[state.theme];

  useEffect(() => {
    loadAppState().then((loaded) => setState(reconcileLetters(loaded)));
  }, []);

  useEffect(() => {
    getCurrentSession()
      .then((session) => setUser(session?.user || null))
      .catch(() => setUser(null));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const addEntry = (entry: Entry) => {
    setCalendarFocusDate(dateKey(entry.createdAt));
    setState((current) => reconcileLetters({
      ...current,
      entries: [entry, ...current.entries]
    }));
    setTab("calendar");
  };

  const setTestToday = (testToday?: string) => {
    const normalized = testToday && /^\d{4}-\d{2}-\d{2}$/.test(testToday) ? testToday : undefined;
    setState((current) => reconcileLetters({ ...current, testToday: normalized }, normalized ? startOfDay(`${normalized}T00:00:00`) : startOfDay(new Date())));
  };

  const addSampleEntry = (entry: Omit<Entry, "id" | "createdAt">) => {
    const sampleDate = state.testToday || dateKey(new Date());
    const createdAt = new Date(`${sampleDate}T09:30:00`).toISOString();
    setCalendarFocusDate(sampleDate);
    setState((current) => reconcileLetters({
      ...current,
      entries: [{ ...entry, id: `${Date.now()}`, createdAt }, ...current.entries]
    }));
    setTab("calendar");
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const session = await signInWithGoogle();
      setUser(session?.user || null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그인에 실패했어.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const setTheme = (theme: ColorTheme) => {
    setState((current) => ({ ...current, theme }));
  };

  const setEnergyColorMode = (energyColorMode: EnergyColorMode) => {
    setState((current) => ({ ...current, energyColorMode }));
  };

  const deleteEntries = (entryIds: string[]) => {
    const ids = new Set(entryIds);
    setState((current) => ({
      ...current,
      entries: current.entries.filter((entry) => !ids.has(entry.id))
    }));
  };

  const content = {
    capture: <CaptureScreen onAddEntry={addEntry} getNow={() => nowForState(state)} energyColorMode={state.energyColorMode} />,
    calendar: (
      <CalendarScreen
        entries={state.entries}
        energyColorMode={state.energyColorMode}
        calendarMode={state.calendarEnergyMode}
        focusDate={calendarFocusDate}
        onDeleteEntries={deleteEntries}
      />
    ),
    inbox: (
      <InboxScreen
        letters={letters}
        onSavePostscript={(letterId, postscript) => {
          setState((current) => ({
            ...current,
            letters: letters.map((letter) => (letter.id === letterId ? { ...letter, postscript } : letter))
          }));
        }}
      />
    ),
    settings: (
      <SettingsScreen
        settings={state.settings}
        onChange={(settings) => setState((current) => ({ ...current, settings }))}
      />
    ),
    appSettings: (
      <AppSettingsScreen
        theme={state.theme}
        energyColorMode={state.energyColorMode}
        calendarEnergyMode={state.calendarEnergyMode}
        onChangeTheme={setTheme}
        onChangeEnergyColorMode={setEnergyColorMode}
        onChangeCalendarEnergyMode={(calendarEnergyMode) => setState((current) => ({ ...current, calendarEnergyMode }))}
      />
    ),
    dev: (
      <DevConsoleScreen
        testToday={state.testToday}
        onChangeTestToday={setTestToday}
        onAddSampleEntry={addSampleEntry}
      />
    )
  }[tab];

  return (
    <AppThemeProvider theme={theme}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.page }]}>
        <StatusBar style="dark" />
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.page }]}>
          <View style={styles.brandWrap}>
            <Image source={require("./assets/icon.png")} style={styles.logo} />
            <View>
              <Text style={styles.brand}>Log to Letter</Text>
              <Text style={styles.tagline}>미래의 나에게 보내는 지금의 나</Text>
            </View>
          </View>
          <Pressable
            style={[styles.menuButton, { backgroundColor: theme.soft }]}
            onPress={() => setMenuOpen((current) => !current)}
          >
            <Text style={[styles.menuButtonText, { color: theme.tint }]}>{menuOpen ? "×" : "☰"}</Text>
          </Pressable>
        </View>
        {menuOpen ? (
          <>
            <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
            <View style={[styles.floatingMenu, { borderColor: theme.border }]}>
              <View style={[styles.floatingMenuHeader, { borderBottomColor: theme.border }]}>
                <Text style={styles.floatingMenuTitle}>메뉴</Text>
                <Pressable style={styles.closeButton} onPress={() => setMenuOpen(false)}>
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>
              <AuthCard
                user={user}
                loading={authLoading}
                error={authError}
                onGoogleLogin={handleGoogleLogin}
                onSignOut={handleSignOut}
              />
              <Pressable
                style={[styles.menuListItem, { borderTopColor: theme.border }]}
                onPress={() => {
                  setTab("appSettings");
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuListIcon}>⚙️</Text>
                <Text style={styles.menuListText}>설정</Text>
              </Pressable>
            </View>
          </>
        ) : null}
        <View style={styles.body}>{content}</View>
        <BottomTabs active={tab} onChange={setTab} />
      </SafeAreaView>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f5f8f1"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe8da",
    backgroundColor: "#fbfdf8"
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 8
  },
  brand: {
    color: "#18241b",
    fontSize: 18,
    fontWeight: "900"
  },
  tagline: {
    color: "#657064",
    fontSize: 12,
    fontWeight: "700"
  },
  menuButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 8
  },
  menuButtonText: {
    fontSize: 22,
    fontWeight: "900"
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: "rgba(24, 36, 27, 0.08)"
  },
  floatingMenu: {
    position: "absolute",
    top: 68,
    right: 14,
    zIndex: 20,
    width: 292,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#18241b",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  floatingMenuHeader: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 14,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe8da",
    backgroundColor: "#fff"
  },
  floatingMenuTitle: {
    color: "#18241b",
    fontSize: 15,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8
  },
  closeButtonText: {
    color: "#657064",
    fontSize: 24,
    fontWeight: "900"
  },
  menuListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#dfe8da",
    backgroundColor: "#fff"
  },
  menuListIcon: {
    fontSize: 17
  },
  menuListText: {
    flex: 1,
    color: "#18241b",
    fontSize: 15,
    fontWeight: "900"
  },
  body: {
    flex: 1
  }
});
