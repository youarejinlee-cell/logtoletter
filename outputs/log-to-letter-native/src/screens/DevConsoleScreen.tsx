import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { useAppTheme } from "../lib/theme";
import { Entry } from "../types/domain";

type Props = {
  testToday?: string;
  onChangeTestToday: (date?: string) => void;
  onAddSampleEntry: (entry: Omit<Entry, "id" | "createdAt">) => void;
};

const samples: Array<Omit<Entry, "id" | "createdAt">> = [
  {
    text: "오늘은 해야 할 일을 작게 나눠보니까 마음이 조금 가벼워졌어.",
    mood: "calm",
    energy: 4
  },
  {
    text: "답장을 기다리면서 내가 뭘 원하는지 계속 생각하게 됐어.",
    mood: "anxious",
    energy: 2
  },
  {
    text: "칭찬을 들었는데 괜히 하루 종일 기분이 좋았어.",
    mood: "proud",
    energy: 5
  }
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DevConsoleScreen({ testToday, onChangeTestToday, onAddSampleEntry }: Props) {
  const theme = useAppTheme();
  const displayToday = testToday || todayKey();
  const [draftDate, setDraftDate] = useState(displayToday);
  const [lastAddedText, setLastAddedText] = useState<string | null>(null);

  useEffect(() => {
    setDraftDate(displayToday);
  }, [displayToday]);

  return (
    <Screen eyebrow="DEVELOPMENT" title="테스트 콘솔" lead="운영 배포 때는 이 화면만 떼어내면 돼.">
      <View style={styles.grid}>
        <Tile label="알림 권한" value="확인 전" />
        <Tile label="마이크 권한" value="확인 전" />
        <Tile label="앱 알림" value="꺼짐" />
        <Tile label="테스트 오늘" value={displayToday} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>오늘 날짜 테스트</Text>
        <Text style={styles.description}>YYYY-MM-DD 형식으로 넣으면 편지 생성 기준 날짜도 그날로 볼게.</Text>
        <TextInput
          value={draftDate}
          onChangeText={(value) => {
            setDraftDate(value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              onChangeTestToday(value);
            }
          }}
          placeholder="2026-06-06"
          style={styles.input}
        />
        <View style={styles.actions}>
          <Pressable style={[styles.secondaryButton, { backgroundColor: theme.soft }]} onPress={() => {
            setDraftDate(todayKey());
            onChangeTestToday(undefined);
          }}>
            <Text style={[styles.secondaryButtonText, { color: theme.tint }]}>실제 오늘로</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, { backgroundColor: theme.soft }]} onPress={() => {
            setDraftDate("2026-06-13");
            onChangeTestToday("2026-06-13");
          }}>
            <Text style={[styles.secondaryButtonText, { color: theme.tint }]}>2026-06-13</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>샘플 기록 넣기</Text>
        <Text style={styles.description}>현재 테스트 오늘 날짜의 오전 9시 30분 기록으로 넣을게.</Text>
        {samples.map((sample) => (
          <Pressable
            key={sample.text}
            style={styles.sampleButton}
            onPress={() => {
              onAddSampleEntry(sample);
              setLastAddedText(`${displayToday} 기록을 넣었어.`);
            }}
          >
            <Text style={styles.sampleText}>{sample.text}</Text>
            <Text style={styles.sampleMeta}>감정 {sample.mood} · 에너지 {sample.energy}</Text>
          </Pressable>
        ))}
        {lastAddedText ? (
          <Text style={[styles.successText, { color: theme.tint }]}>{lastAddedText}</Text>
        ) : null}
      </View>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  tile: {
    width: "48%",
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  label: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "800"
  },
  value: {
    color: "#18241b",
    fontSize: 18,
    fontWeight: "900"
  },
  panel: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  sectionTitle: {
    color: "#18241b",
    fontSize: 16,
    fontWeight: "900"
  },
  description: {
    color: "#657064",
    fontSize: 13,
    lineHeight: 19
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    color: "#18241b",
    fontSize: 15,
    fontWeight: "800"
  },
  actions: {
    flexDirection: "row",
    gap: 8
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#e7f6df"
  },
  secondaryButtonText: {
    color: "#2f8f54",
    fontWeight: "900"
  },
  sampleButton: {
    gap: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#f5f8f1"
  },
  sampleText: {
    color: "#18241b",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800"
  },
  sampleMeta: {
    color: "#657064",
    fontSize: 12,
    fontWeight: "800"
  },
  successText: {
    fontSize: 13,
    fontWeight: "900"
  }
});
