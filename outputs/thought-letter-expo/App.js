import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";

const STORAGE_KEY = "thought-letter-expo-v1";

const moodLabels = {
  calm: "차분함",
  joy: "좋음",
  tired: "피곤함",
  anxious: "불안함",
  sad: "가라앉음",
  angry: "날카로움",
};

const defaultState = {
  settings: {
    startTime: "09:30",
    dndStart: "22:30",
    dndEnd: "08:00",
    intervalMinutes: 120,
    enabled: false,
  },
  entries: [],
  letter: null,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [appState, setAppState] = useState(defaultState);
  const [view, setView] = useState("capture");
  const [thought, setThought] = useState("");
  const [mood, setMood] = useState("calm");
  const [energy, setEnergy] = useState(3);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setAppState({ ...defaultState, ...JSON.parse(raw) });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState, loaded]);

  const weekEntries = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return appState.entries.filter((entry) => new Date(entry.createdAt).getTime() >= weekAgo);
  }, [appState.entries]);

  function updateState(next) {
    setAppState((current) => (typeof next === "function" ? next(current) : next));
  }

  function addEntry(textValue = thought, moodValue = mood, energyValue = energy) {
    const trimmed = textValue.trim();
    if (!trimmed) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: trimmed,
      mood: moodValue,
      energy: Number(energyValue),
      createdAt: new Date().toISOString(),
    };

    updateState((current) => ({
      ...current,
      entries: [entry, ...current.entries],
      letter: null,
    }));
    setThought("");
    setMood("calm");
    setEnergy(3);
  }

  async function requestAndSchedule(settings) {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("thought-checkins", {
        name: "생각 체크인",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("알림 권한이 필요해요", "설정에서 알림을 허용하면 정해진 리듬으로 질문을 받을 수 있어요.");
      return false;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!settings.enabled) return true;

    const nextDates = getNextPromptDates(settings, 24);
    await Promise.all(
      nextDates.map((date) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: "지금 무슨 생각 하고 있어?",
            body: "한 문장만 남겨도 이번 주 편지의 재료가 돼요.",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: "thought-checkins",
          },
        })
      )
    );
    return true;
  }

  async function saveSettings(settings) {
    const ok = await requestAndSchedule(settings);
    updateState((current) => ({
      ...current,
      settings: { ...settings, enabled: ok ? settings.enabled : false },
    }));
  }

  function generateLetter() {
    if (!weekEntries.length) {
      updateState((current) => ({
        ...current,
        letter: {
          body: "이번 주 기록이 아직 없어요. 생각 몇 개를 남기면 편지를 만들 수 있습니다.",
          themes: [],
          recommendations: [],
        },
      }));
      return;
    }

    const analysis = analyzeEntries(weekEntries);
    const recommendations = makeRecommendations(analysis);
    const themeText = analysis.themes.length ? analysis.themes.join(", ") : "아직 선명한 반복어는 적었어요";
    const body = `이번 주 기록에서는 ${themeText} 같은 단어들이 자주 보였어요. 평균 에너지는 ${analysis.averageEnergy}/5, 가장 자주 나타난 감정은 ${moodLabels[analysis.dominantMood]}이었습니다.\n\n당신은 이번 주에 해야 할 일과 마음의 여유 사이를 자주 오간 것 같아요. 문제를 크게 만들기보다, 머릿속에 떠오른 조각들을 붙잡아 두려는 시도가 보입니다.\n\n다음 주에는 스스로를 고치려는 태도보다 관찰하는 태도를 먼저 가져가면 좋겠어요. 생각이 반복될 때 “내가 왜 이러지?” 대신 “이 생각은 언제 강해지지?”라고 물어보세요.`;

    updateState((current) => ({
      ...current,
      letter: { body, themes: analysis.themes, recommendations },
    }));
  }

  function seedDemoData() {
    const examples = [
      ["해야 할 일이 많은데 무엇부터 잡아야 할지 몰라서 계속 미루고 있다.", "anxious", 2],
      ["오전에 산책하고 나니 생각이 조금 정리됐다. 몸을 먼저 움직이는 게 도움이 됐다.", "calm", 4],
      ["회의에서 내가 말한 부분이 계속 마음에 걸린다. 사실보다 해석을 더 크게 만들고 있는 것 같다.", "anxious", 3],
      ["오래 미뤄둔 메일 하나를 보냈다. 작지만 꽤 가벼워졌다.", "joy", 4],
      ["저녁에는 에너지가 너무 낮아서 결정하는 일이 버겁다.", "tired", 2],
    ];

    updateState((current) => ({
      ...current,
      entries: [
        ...examples.map(([text, entryMood, entryEnergy]) => ({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text,
          mood: entryMood,
          energy: entryEnergy,
          createdAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString(),
        })),
        ...current.entries,
      ],
      letter: null,
    }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>THOUGHT LETTER</Text>
            <Text style={styles.brand}>무슨 생각</Text>
          </View>
          <Pressable style={styles.askButton} onPress={() => addEntry("지금 떠오른 생각을 기록해보자.", "calm", 3)}>
            <Text style={styles.askButtonText}>?</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {[
            ["capture", "기록"],
            ["letter", "편지"],
            ["settings", "설정"],
          ].map(([key, label]) => (
            <Pressable key={key} style={[styles.tab, view === key && styles.tabActive]} onPress={() => setView(key)}>
              <Text style={[styles.tabText, view === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {view === "capture" && (
            <View>
              <Text style={styles.eyebrow}>TODAY</Text>
              <Text style={styles.title}>지금 무슨 생각 하고 있어?</Text>
              <View style={styles.panel}>
                <Text style={styles.label}>생각</Text>
                <TextInput
                  multiline
                  placeholder="한 문장이어도 좋아요."
                  placeholderTextColor="#8a928d"
                  style={styles.textArea}
                  value={thought}
                  onChangeText={setThought}
                />

                <Text style={styles.label}>감정</Text>
                <View style={styles.chipGrid}>
                  {Object.entries(moodLabels).map(([key, label]) => (
                    <Pressable key={key} style={[styles.chip, mood === key && styles.chipActive]} onPress={() => setMood(key)}>
                      <Text style={[styles.chipText, mood === key && styles.chipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>에너지 {energy}/5</Text>
                <View style={styles.energyRow}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable key={value} style={[styles.energyDot, energy >= value && styles.energyDotActive]} onPress={() => setEnergy(value)} />
                  ))}
                </View>

                <View style={styles.buttonRow}>
                  <Pressable style={styles.secondaryButton} onPress={seedDemoData}>
                    <Text style={styles.secondaryText}>예시 채우기</Text>
                  </Pressable>
                  <Pressable style={styles.primaryButton} onPress={() => addEntry()}>
                    <Text style={styles.primaryText}>남기기</Text>
                  </Pressable>
                </View>
              </View>

              <SectionTitle title="최근 기록" action="비우기" onAction={() => updateState((current) => ({ ...current, entries: [], letter: null }))} />
              {appState.entries.length ? (
                appState.entries.slice(0, 20).map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={() =>
                      updateState((current) => ({
                        ...current,
                        entries: current.entries.filter((item) => item.id !== entry.id),
                        letter: null,
                      }))
                    }
                  />
                ))
              ) : (
                <Text style={styles.empty}>첫 생각을 남기면 여기에 쌓입니다.</Text>
              )}
            </View>
          )}

          {view === "letter" && (
            <View>
              <Text style={styles.eyebrow}>WEEKLY</Text>
              <Text style={styles.title}>이번 주의 편지</Text>
              <Pressable style={styles.primaryButtonWide} onPress={generateLetter}>
                <Text style={styles.primaryText}>편지 만들기</Text>
              </Pressable>

              <View style={styles.letterPaper}>
                <Text style={styles.letterText}>{appState.letter?.body || "아직 편지가 없어요."}</Text>
              </View>

              <InsightBlock title="반복된 생각" items={appState.letter?.themes?.length ? appState.letter.themes : ["기록이 쌓이면 나타납니다."]} />
              <InsightBlock title="다음 주 제안" items={appState.letter?.recommendations?.length ? appState.letter.recommendations : ["편지를 만들면 나타납니다."]} />
            </View>
          )}

          {view === "settings" && (
            <SettingsPanel settings={appState.settings} onSave={saveSettings} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings]);

  return (
    <View>
      <Text style={styles.eyebrow}>RHYTHM</Text>
      <Text style={styles.title}>알림 리듬</Text>
      <View style={styles.panel}>
        <SettingInput label="시작 시간" value={draft.startTime} onChangeText={(value) => setDraft({ ...draft, startTime: value })} />
        <SettingInput label="방해금지 시작" value={draft.dndStart} onChangeText={(value) => setDraft({ ...draft, dndStart: value })} />
        <SettingInput label="방해금지 종료" value={draft.dndEnd} onChangeText={(value) => setDraft({ ...draft, dndEnd: value })} />
        <SettingInput
          label="알림 간격(분)"
          keyboardType="number-pad"
          value={String(draft.intervalMinutes)}
          onChangeText={(value) => setDraft({ ...draft, intervalMinutes: Number(value || 0) })}
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>정해진 리듬으로 묻기</Text>
          <Switch value={draft.enabled} onValueChange={(enabled) => setDraft({ ...draft, enabled })} />
        </View>
        <Pressable style={styles.primaryButtonWide} onPress={() => onSave(draft)}>
          <Text style={styles.primaryText}>저장하고 알림 예약</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingInput({ label, ...props }) {
  return (
    <View style={styles.settingField}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#8a928d" {...props} />
    </View>
  );
}

function SectionTitle({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onAction}>
        <Text style={styles.linkText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function EntryCard({ entry, onDelete }) {
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryMeta}>
        <Text style={styles.metaText}>{formatDateTime(entry.createdAt)}</Text>
        <Text style={styles.moodChip}>{moodLabels[entry.mood]}</Text>
        <Text style={styles.metaText}>에너지 {entry.energy}/5</Text>
      </View>
      <Text style={styles.entryText}>{entry.text}</Text>
      <Pressable style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.linkText}>삭제</Text>
      </Pressable>
    </View>
  );
}

function InsightBlock({ title, items }) {
  return (
    <View style={styles.insightBlock}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.bullet}>• {item}</Text>
      ))}
    </View>
  );
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function minutesFromTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isQuietTime(date, settings) {
  const now = date.getHours() * 60 + date.getMinutes();
  const start = minutesFromTime(settings.dndStart);
  const end = minutesFromTime(settings.dndEnd);
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function getNextPromptDates(settings, count) {
  const dates = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);

  while (dates.length < count) {
    cursor.setMinutes(cursor.getMinutes() + settings.intervalMinutes);
    const start = minutesFromTime(settings.startTime);
    const current = cursor.getHours() * 60 + cursor.getMinutes();
    if (current < start || isQuietTime(cursor, settings)) continue;
    dates.push(new Date(cursor));
  }

  return dates;
}

function tokenize(text) {
  const stop = new Set(["그리고", "그런데", "오늘", "내가", "나는", "너무", "조금", "계속", "생각", "있는", "같다", "해서", "하면"]);
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !stop.has(word));
}

function analyzeEntries(entries) {
  const counts = new Map();
  const moodCounts = new Map();
  let energyTotal = 0;

  for (const entry of entries) {
    energyTotal += entry.energy;
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
    for (const token of tokenize(entry.text)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  const themes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `${word} (${count})`);

  const dominantMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "calm";
  const averageEnergy = entries.length ? (energyTotal / entries.length).toFixed(1) : "0";

  return { themes, dominantMood, averageEnergy };
}

function makeRecommendations(analysis) {
  const moodSpecific = {
    anxious: "불안이 올라올 때 4초 들이마시고 6초 내쉬는 호흡을 세 번 반복하기",
    tired: "에너지가 낮은 시간대에는 결정이 필요한 일을 줄이고 루틴 업무부터 배치하기",
    sad: "기분을 바꾸려 애쓰기보다 10분 산책처럼 몸의 상태를 먼저 움직이기",
    angry: "반응하기 전에 메시지를 임시 보관하고 20분 뒤 다시 읽어보기",
    joy: "좋았던 순간의 조건을 적어 다음 주 일정에 하나 더 넣기",
    calm: "집중이 잘 되는 조건을 관찰해서 다음 주 첫 업무 전에 복제하기",
  };

  return [
    moodSpecific[analysis.dominantMood],
    "같은 걱정이 반복될 때 사실, 해석, 다음 행동을 한 줄씩 분리해보기",
    "하루 끝에 좋았던 단서 하나를 남겨 뇌가 보상 신호를 다시 보게 하기",
  ];
}

const colors = {
  ink: "#1f2522",
  muted: "#66706a",
  line: "#d9ded8",
  paper: "#fbfaf7",
  panel: "#ffffff",
  mint: "#dceee7",
  green: "#2f6f5e",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eef3ef",
  },
  eyebrow: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  brand: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
  },
  askButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  askButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: "#eef3ef",
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
  },
  tabText: {
    color: colors.ink,
    fontWeight: "700",
  },
  tabTextActive: {
    color: colors.green,
  },
  content: {
    padding: 18,
    paddingBottom: 48,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    marginBottom: 22,
  },
  panel: {
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.panel,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
  },
  textArea: {
    minHeight: 160,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: "#fcfcfa",
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f5f2",
  },
  chipActive: {
    backgroundColor: colors.mint,
  },
  chipText: {
    color: colors.muted,
    fontWeight: "800",
  },
  chipTextActive: {
    color: colors.green,
  },
  energyRow: {
    flexDirection: "row",
    gap: 10,
  },
  energyDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#f7f8f6",
  },
  energyDotActive: {
    backgroundColor: colors.green,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  primaryButtonWide: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    marginBottom: 14,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panel,
  },
  secondaryText: {
    color: colors.ink,
    fontWeight: "800",
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
  },
  linkText: {
    color: colors.green,
    fontWeight: "800",
  },
  entryCard: {
    gap: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.panel,
  },
  entryMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
  },
  moodChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.mint,
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  entryText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  deleteButton: {
    alignSelf: "flex-end",
  },
  empty: {
    color: colors.muted,
    lineHeight: 24,
  },
  letterPaper: {
    minHeight: 280,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.panel,
    marginBottom: 14,
  },
  letterText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 27,
  },
  insightBlock: {
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.panel,
    marginBottom: 12,
    gap: 10,
  },
  bullet: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 23,
  },
  settingField: {
    gap: 8,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: "#fcfcfa",
    color: colors.ink,
    fontSize: 16,
  },
  switchRow: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
