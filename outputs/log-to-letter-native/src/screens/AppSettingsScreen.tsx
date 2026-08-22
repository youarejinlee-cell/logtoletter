import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { emotionGroupLabels, emotionGroups, getEmotionTag, tagsForEmotionGroup } from "../lib/emotionTags";
import { useAppTheme } from "../lib/theme";
import { LetterPaperStyle } from "../types/domain";
import { EmotionGroup, EmotionTagId, RepresentativeEmotionTags } from "../types/emotions";

type Props = {
  representativeEmotionTags: RepresentativeEmotionTags;
  letterPaperStyle: LetterPaperStyle;
  letterArchiveEnabled?: boolean;
  onSaveRepresentativeEmotionTags: (tags: RepresentativeEmotionTags) => Promise<void>;
  onChangeLetterPaperStyle: (style: LetterPaperStyle) => void;
};

const letterPaperOptions: Array<{ key: LetterPaperStyle; label: string; description: string }> = [
  { key: "plain", label: "무지", description: "가장 조용한 기본 편지지" },
  { key: "themeBorder", label: "편지지 테두리", description: "현재 테마색 테두리 편지지" },
  { key: "cloudTitle", label: "제목+내용 분리", description: "내용을 둥근 박스로 정리" },
  { key: "clover", label: "클로버 무늬", description: "세잎클로버 틈바구니에 숨어 있는 네잎클로버 하나" }
];

export function AppSettingsScreen({
  representativeEmotionTags,
  letterPaperStyle,
  letterArchiveEnabled,
  onSaveRepresentativeEmotionTags,
  onChangeLetterPaperStyle
}: Props) {
  const currentTheme = useAppTheme();
  const [representativeDraft, setRepresentativeDraft] = useState(representativeEmotionTags);
  const [expandedGroups, setExpandedGroups] = useState<Record<EmotionGroup, boolean>>({
    positive: false,
    neutral: false,
    negative: false
  });
  const [representativeSaveState, setRepresentativeSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setRepresentativeDraft(representativeEmotionTags);
  }, [representativeEmotionTags]);

  const toggleRepresentativeTag = (group: EmotionGroup, id: EmotionTagId) => {
    setRepresentativeSaveState("idle");
    setRepresentativeDraft((current) => {
      const selected = current[group];
      if (selected.includes(id)) {
        return { ...current, [group]: selected.filter((item) => item !== id) };
      }
      if (selected.length >= 4) return current;
      return { ...current, [group]: [...selected, id] };
    });
  };

  const saveRepresentativeTags = async () => {
    if (emotionGroups.some((group) => representativeDraft[group].length !== 4)) {
      setRepresentativeSaveState("error");
      return;
    }
    setRepresentativeSaveState("saving");
    try {
      await onSaveRepresentativeEmotionTags(representativeDraft);
      setRepresentativeSaveState("saved");
    } catch {
      setRepresentativeSaveState("error");
    }
  };
  return (
    <Screen eyebrow="Settings" title="설정">
      <View style={[styles.panel, { borderColor: currentTheme.border, backgroundColor: currentTheme.card }]}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>대표 감정 태그</Text>
        <Text style={[styles.description, { color: currentTheme.muted }]}>기록 탭에 먼저 보일 감정을 각 영역에서 4개씩 골라줘. 저장하기 전까지는 기록 탭에 반영되지 않아.</Text>
        <View style={styles.representativeGroups}>
          {emotionGroups.map((group) => {
            const selectedIds = representativeDraft[group];
            const expanded = expandedGroups[group];
            const visibleTags = expanded
              ? tagsForEmotionGroup(group)
              : selectedIds.map((id) => getEmotionTag(id)).filter((tag) => tag !== null);
            return (
              <View key={group} style={[styles.representativeGroup, { borderTopColor: currentTheme.border }]}>
                <View style={styles.representativeHeader}>
                  <View style={styles.representativeHeading}>
                    <Text style={[styles.representativeTitle, { color: currentTheme.text }]}>{emotionGroupLabels[group]}</Text>
                    <Text style={[styles.representativeCount, { color: currentTheme.muted }]}>{selectedIds.length} / 4</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${emotionGroupLabels[group]} ${expanded ? "접기" : "펼치기"}`}
                    style={[styles.expandButton, { backgroundColor: currentTheme.soft }]}
                    onPress={() => setExpandedGroups((current) => ({ ...current, [group]: !current[group] }))}
                  >
                    <Text style={[styles.expandText, { color: currentTheme.tint }]}>{expanded ? "−" : "+"}</Text>
                  </Pressable>
                </View>
                <View style={styles.moodWrap}>
                  {visibleTags.map((tag) => {
                    const active = selectedIds.includes(tag.id);
                    const disabled = !active && selectedIds.length >= 4;
                    return (
                      <Pressable
                        key={tag.id}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled }}
                        style={[
                          styles.moodChip,
                          { borderColor: currentTheme.border, backgroundColor: currentTheme.cardAlt },
                          active && { borderColor: currentTheme.tint, backgroundColor: currentTheme.soft, borderWidth: 2 },
                          disabled && styles.disabledChip
                        ]}
                        onPress={() => toggleRepresentativeTag(group, tag.id)}
                      >
                        <Text maxFontSizeMultiplier={1.2} style={[styles.moodText, { color: currentTheme.text }, active && { color: currentTheme.tint }]}>{tag.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
        {representativeSaveState === "error" ? <Text style={styles.saveError}>각 영역에서 대표 감정을 4개씩 선택해줘.</Text> : null}
        {representativeSaveState === "saved" ? <Text style={[styles.saveStatus, { color: currentTheme.tint }]}>기록 탭에 대표 감정을 반영했어.</Text> : null}
        <Pressable
          disabled={representativeSaveState === "saving"}
          style={[styles.saveButton, { backgroundColor: currentTheme.tint }, representativeSaveState === "saving" && styles.disabledChip]}
          onPress={() => void saveRepresentativeTags()}
        >
          <Text style={[styles.saveButtonText, { color: currentTheme.inverseText }]}>{representativeSaveState === "saving" ? "저장 중..." : "저장"}</Text>
        </Pressable>
      </View>

      {letterArchiveEnabled ? (
        <View style={[styles.panel, { borderColor: currentTheme.border, backgroundColor: currentTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>편지지 디자인</Text>
          <View style={styles.letterPaperList}>
            {letterPaperOptions.map((option) => (
              <Pressable
                key={option.key}
                style={[
                  styles.letterPaperButton,
                  { borderColor: currentTheme.border, backgroundColor: currentTheme.cardAlt },
                  letterPaperStyle === option.key && { borderColor: currentTheme.tint, backgroundColor: currentTheme.soft, borderWidth: 2 }
                ]}
                onPress={() => onChangeLetterPaperStyle(option.key)}
              >
                <View style={[styles.paperPreview, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }, option.key !== "plain" && { borderColor: currentTheme.tint }]}>
                  {option.key === "clover" ? (
                    <>
                      <MiniClover color={currentTheme.tint} style={styles.paperCloverTop} />
                      <MiniClover color={currentTheme.tint} style={styles.paperCloverBottom} />
                    </>
                  ) : null}
                  {option.key === "cloudTitle" ? <View style={[styles.paperSplitPreview, { backgroundColor: currentTheme.soft }]} /> : null}
                </View>
                <View style={styles.letterPaperTextWrap}>
                  <Text style={[styles.energyModeLabel, { color: currentTheme.text }]}>{option.label}</Text>
                  <Text style={[styles.paperDescription, { color: currentTheme.muted }]}>{option.description}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function MiniClover({ color, style, fourLeaf }: { color: string; style?: object; fourLeaf?: boolean }) {
  return (
    <View style={[styles.miniClover, style]}>
      <View style={[styles.miniCloverLeaf, styles.miniCloverTopLeaf, { backgroundColor: color }]} />
      <View style={[styles.miniCloverLeaf, styles.miniCloverLeftLeaf, { backgroundColor: color }]} />
      <View style={[styles.miniCloverLeaf, styles.miniCloverRightLeaf, { backgroundColor: color }]} />
      {fourLeaf ? <View style={[styles.miniCloverLeaf, styles.miniCloverBottomLeaf, { backgroundColor: color }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 14,
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
  description: {
    color: "#657064",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  representativeGroups: {
    gap: 12
  },
  representativeGroup: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1
  },
  representativeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  representativeHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  representativeTitle: {
    fontSize: 14,
    fontWeight: "900"
  },
  representativeCount: {
    fontSize: 12,
    fontWeight: "800"
  },
  expandButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8
  },
  expandText: {
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "900"
  },
  moodWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  moodChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999
  },
  moodText: {
    color: "#253027",
    fontSize: 12,
    fontWeight: "900"
  },
  disabledChip: {
    opacity: 0.4
  },
  disabledText: {
    color: "#9aa39a"
  },
  saveError: {
    color: "#d85b52",
    fontSize: 12,
    fontWeight: "800"
  },
  saveStatus: {
    fontSize: 12,
    fontWeight: "800"
  },
  saveButton: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 8
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "900"
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  themeButton: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8
  },
  themeSwatch: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 999
  },
  themeButtonText: {
    color: "#18241b",
    fontWeight: "900"
  },
  energyModeLabel: {
    color: "#18241b",
    fontSize: 14,
    fontWeight: "900"
  },
  letterPaperList: {
    gap: 8
  },
  letterPaperButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8
  },
  paperPreview: {
    position: "relative",
    width: 42,
    height: 54,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 6,
    backgroundColor: "#fff"
  },
  miniClover: {
    position: "absolute",
    width: 22,
    height: 20,
    opacity: 0.72
  },
  miniCloverLeaf: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 999
  },
  miniCloverTopLeaf: {
    top: 0,
    left: 5
  },
  miniCloverLeftLeaf: {
    top: 8,
    left: 1
  },
  miniCloverRightLeaf: {
    top: 8,
    right: 1
  },
  miniCloverBottomLeaf: {
    bottom: 0,
    left: 5
  },
  paperCloverTop: {
    top: 4,
    right: 4
  },
  paperCloverBottom: {
    bottom: 5,
    left: 4
  },
  paperSplitPreview: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    height: 25,
    borderRadius: 6
  },
  letterPaperTextWrap: {
    flex: 1,
    gap: 4
  },
  paperDescription: {
    color: "#657064",
    fontSize: 12,
    fontWeight: "700"
  }
});
