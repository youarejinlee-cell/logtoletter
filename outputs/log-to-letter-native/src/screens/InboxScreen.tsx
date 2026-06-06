import { useState } from "react";
import { Image, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { useAppTheme } from "../lib/theme";
import { Letter } from "../types/domain";

type Props = {
  letters: Letter[];
  onSavePostscript: (letterId: string, postscript: string) => void;
};

function monthLabel(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatPeriodLabel(value: string) {
  return value
    .split("~")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(formatDateLabel)
    .join(" ~ ");
}

export function InboxScreen({ letters, onSavePostscript }: Props) {
  const theme = useAppTheme();
  const [selected, setSelected] = useState<Letter | null>(null);
  const [postscript, setPostscript] = useState("");
  const sorted = [...letters].sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime());
  const groups = sorted.reduce<Record<string, Letter[]>>((acc, letter) => {
    const key = monthLabel(letter.deliveredAt);
    acc[key] = [...(acc[key] || []), letter];
    return acc;
  }, {});

  if (selected) {
    const shareLetter = async () => {
      await Share.share({
        title: selected.title,
        message: `${selected.title}\n\n${formatPeriodLabel(selected.periodLabel)}\n\n${selected.body}\n\nLog to Letter`
      });
    };

    return (
      <Screen eyebrow="LETTER" title="편지보관함">
        <Pressable style={styles.back} onPress={() => setSelected(null)}>
          <Text style={[styles.backText, { color: theme.tint }]}>← 목록으로</Text>
        </Pressable>
        <View style={styles.paper}>
          <Text style={styles.letterTitle}>{selected.title}</Text>
          <View style={styles.letterMeta}>
            <Text style={styles.letterMetaText}>받은 날짜 {formatDateLabel(selected.deliveredAt)}</Text>
            <Text style={styles.letterMetaText}>기록 기간 {formatPeriodLabel(selected.periodLabel)}</Text>
          </View>
          <Text style={styles.body}>{selected.body}</Text>
        </View>
        <View style={styles.postscript}>
          <Text style={styles.sectionTitle}>추신</Text>
          <TextInput
            multiline
            value={postscript || selected.postscript || ""}
            onChangeText={setPostscript}
            placeholder="이 편지를 읽고 지금의 내가 남기고 싶은 말을 적어봐."
            style={styles.postscriptInput}
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.save, { backgroundColor: theme.tint }]}
            onPress={() => {
              onSavePostscript(selected.id, postscript);
              setSelected({ ...selected, postscript });
            }}
          >
            <Text style={styles.saveText}>저장하기</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.share, { borderColor: theme.border, backgroundColor: theme.soft }]} onPress={shareLetter}>
          <Text style={[styles.shareText, { color: theme.tint }]}>공유하기</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen eyebrow="LETTER" title="편지보관함" lead="지난 날의 네가 보낸 편지를 확인해봐.">
      {sorted.length ? (
        Object.entries(groups).map(([label, items]) => (
          <View key={label} style={styles.group}>
            <Text style={styles.month}>{label}</Text>
            <View style={styles.grid}>
              {items.map((letter) => (
                <Pressable key={letter.id} style={styles.card} onPress={() => {
                  setPostscript(letter.postscript || "");
                  setSelected(letter);
                }}>
                  <Image source={require("../../assets/icon.png")} style={styles.icon} />
                  <Text style={styles.keyword}>{letter.keyword}</Text>
                  <Text style={[styles.date, { color: theme.tint }]}>{dateKey(letter.deliveredAt)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>아직 도착한 편지가 없어.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: "flex-start",
    paddingVertical: 8
  },
  backText: {
    color: "#2f8f54",
    fontWeight: "900"
  },
  group: {
    gap: 12
  },
  month: {
    color: "#18241b",
    fontSize: 18,
    fontWeight: "900"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  card: {
    width: "48%",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  icon: {
    width: 96,
    height: 96
  },
  keyword: {
    color: "#18241b",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "center"
  },
  date: {
    color: "#2f8f54",
    fontSize: 13,
    fontWeight: "900"
  },
  empty: {
    color: "#657064",
    fontSize: 15
  },
  paper: {
    gap: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  letterTitle: {
    color: "#18241b",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 29
  },
  letterMeta: {
    alignItems: "flex-end",
    gap: 3
  },
  letterMetaText: {
    color: "#657064",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right"
  },
  body: {
    color: "#253027",
    fontSize: 16,
    lineHeight: 25
  },
  postscript: {
    gap: 10,
    padding: 16,
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
  postscriptInput: {
    minHeight: 96,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8
  },
  save: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: "#18241b"
  },
  saveText: {
    color: "#fff",
    fontWeight: "900"
  },
  share: {
    alignItems: "center",
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  shareText: {
    color: "#18241b",
    fontWeight: "900"
  }
});
