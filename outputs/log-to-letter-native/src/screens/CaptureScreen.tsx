import { useRef, useState } from "react";
import { Keyboard, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CloverBadge } from "../components/CloverBadge";
import { Screen } from "../components/Screen";
import { entryCategoryOptions, suggestEntryCategory } from "../lib/entryCategories";
import { getEnergyPalette } from "../lib/energyColors";
import { entryTextLength, MAX_ENTRY_TEXT_LENGTH } from "../lib/entryText";
import { createId } from "../lib/ids";
import { useAppTheme } from "../lib/theme";
import { EnergyColorMode, Entry, EntryCategory, Mood } from "../types/domain";

type Props = {
  onAddEntry: (entry: Entry) => void;
  getNow?: () => Date;
  energyColorMode: EnergyColorMode;
};

const hints = [
  ["방금 깨달은 것", "방금 깨달은 것은 "],
  ["오늘 몸의 신호", "오늘 몸의 신호는 "],
  ["감사한 것", "감사한 것은 "],
  ["나 자신이 좋았던 순간", "나 자신이 좋았던 순간은 "],
  ["칭찬 받은 것", "칭찬 받은 건 "],
  ["부러운 것", "부러웠던 건 "],
  ["욕하고 있었음", "아까 속으로 욕하고 있었던 건 "],
  ["아까 쇼핑한 것", "아까 쇼핑한 건 "],
  ["배울 점", "오늘 ~에게 배운 게 있다면 "],
  ["숨겨진 욕망 발견", "나도 몰랐는데, 사실 나는 "],
  ["고민되는 것", "요즘 고민되는 건 "],
  ["먹은 것", "아까 먹은 "],
  ["쇼츠에서 본", "쇼츠에서 본 건데 "]
];

const positiveMoods: Array<{ key: Mood; label: string }> = [
  { key: "calm", label: "😌 차분함" },
  { key: "joy", label: "😊 좋음" },
  { key: "moved", label: "🥹 뭉클함" },
  { key: "recovered", label: "🌱 회복됨" },
  { key: "proud", label: "✨ 뿌듯함" },
  { key: "grateful", label: "🙏 고마움" },
  { key: "peaceful", label: "🕊️ 평화로움" },
  { key: "lucky", label: "🍀 행운" },
  { key: "happy", label: "😄 행복함" },
  { key: "delight", label: "😁 기쁨" },
  { key: "excited", label: "💓 설렘" },
  { key: "fun", label: "😆 재밌음" },
  { key: "hopeful", label: "🌤️ 희망적임" },
  { key: "selfEsteem", label: "💪 자존감상승" }
];

const neutralMoods: Array<{ key: Mood; label: string }> = [
  { key: "complex", label: "🤔 복잡함" },
  { key: "indifferent", label: "😶 무덤덤함" },
  { key: "curious", label: "🧐 궁금함" },
  { key: "accepting", label: "🤲 받아들임" },
  { key: "reflective", label: "🪞 반성함" },
  { key: "envious", label: "🫧 부러움" },
  { key: "instructive", label: "📌 교훈적임" },
  { key: "difficult", label: "🧩 어려움" },
  { key: "blank", label: "🫠 멍함" }
];

const negativeMoods: Array<{ key: Mood; label: string }> = [
  { key: "anxious", label: "😟 불안함" },
  { key: "worried", label: "😥 걱정됨" },
  { key: "tired", label: "😮‍💨 피곤함" },
  { key: "sad", label: "😔 가라앉음" },
  { key: "depressed", label: "🌧️ 우울함" },
  { key: "angry", label: "😤 날카로움" },
  { key: "irritated", label: "😒 짜증남" },
  { key: "jealous", label: "🫣 질투" },
  { key: "prideHurt", label: "😣 자존심상함" },
  { key: "sensitive", label: "🫨 예민함" },
  { key: "regret", label: "😞 후회됨" }
];

const textPlaceholders = [
  "무슨 생각 하고 있었어?",
  "어떤 감정을 느끼고 있었어?"
];

function randomPlaceholder() {
  return textPlaceholders[Math.floor(Math.random() * textPlaceholders.length)];
}

export function CaptureScreen({ onAddEntry, getNow = () => new Date(), energyColorMode }: Props) {
  const theme = useAppTheme();
  const energyLevels = getEnergyPalette(energyColorMode, theme.tint).levels;
  const inputRef = useRef<TextInput | null>(null);
  const sliderRef = useRef<View | null>(null);
  const sliderLeft = useRef(0);
  const textDraft = useRef("");
  const [hasText, setHasText] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [mood, setMood] = useState<Mood | null>(null);
  const [category, setCategory] = useState<EntryCategory>("other");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [energy, setEnergy] = useState(50);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [placeholder, setPlaceholder] = useState(randomPlaceholder);
  const [positiveExpanded, setPositiveExpanded] = useState(true);
  const [neutralExpanded, setNeutralExpanded] = useState(true);
  const [negativeExpanded, setNegativeExpanded] = useState(true);
  const energyValue = energy;
  const canSubmit = Boolean(hasText && mood);
  const energyLevel = energyLevels.find((level) => level.value === energyValue) || energyLevels[0];

  const dismissEntryKeyboard = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  const updateEnergyFromPageX = (pageX: number) => {
    const ratio = Math.max(0, Math.min(1, (pageX - sliderLeft.current) / sliderWidth));
    setEnergy(Math.round(ratio * 10) * 10);
  };

  const measureSlider = (pageX?: number) => {
    sliderRef.current?.measureInWindow((x, _y, width) => {
      sliderLeft.current = x;
      setSliderWidth(width || 1);
      if (typeof pageX === "number") updateEnergyFromPageX(pageX);
    });
  };

  const energyPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      dismissEntryKeyboard();
      measureSlider(event.nativeEvent.pageX);
    },
    onPanResponderMove: (event) => updateEnergyFromPageX(event.nativeEvent.pageX)
  });

  const updateDraft = (next: string) => {
    textDraft.current = next;
    setCharacterCount(entryTextLength(next));
    const nextHasText = Boolean(next.trim());
    setHasText((current) => (current === nextHasText ? current : nextHasText));
    if (!categoryTouched) setCategory(suggestEntryCategory(next));
  };

  const replaceInputText = (next: string) => {
    textDraft.current = next;
    setCharacterCount(entryTextLength(next));
    inputRef.current?.setNativeProps({ text: next });
    setHasText(Boolean(next.trim()));
    if (!categoryTouched) setCategory(suggestEntryCategory(next));
  };

  return (
    <Screen
      eyebrow="LOG"
      title="기록"
      lead={"지금 이 순간의 생각과 감정을 솔직하게 남겨봐.\n그 기록이 미래의 너에게 의미로 돌아올 거야."}
      dismissKeyboardOnTouchOutside
    >
      <View style={styles.textareaGroup}>
        <TextInput
          ref={inputRef}
          multiline
          placeholder={placeholder}
          maxLength={MAX_ENTRY_TEXT_LENGTH}
          onChangeText={updateDraft}
          placeholderTextColor={theme.muted}
          style={[
            styles.textarea,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
              color: theme.text
            }
          ]}
          textAlignVertical="top"
        />
        <Text
          style={[styles.characterCount, { color: theme.muted }]}
          accessibilityLabel={`현재 글자 수 ${characterCount}, 최대 ${MAX_ENTRY_TEXT_LENGTH}`}
        >
          {characterCount} / {MAX_ENTRY_TEXT_LENGTH}
        </Text>
      </View>

      <View style={styles.hints}>
        {hints.map(([label, prompt]) => (
          <Pressable
            key={label}
            style={[styles.hint, { backgroundColor: theme.soft }]}
            onPress={() => {
              const current = textDraft.current;
              replaceInputText(`${current}${current ? "\n" : ""}${prompt}`);
            }}
          >
            <Text style={[styles.hintText, { color: theme.tint }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>기록 카테고리</Text>
      <View style={[styles.categoryPanel, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.categoryHint, { color: theme.muted }]}>기록을 보고 먼저 골라둘게. 필요하면 바꿔줘.</Text>
        <View style={styles.chips}>
          {entryCategoryOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.chip,
                { borderColor: theme.border, backgroundColor: theme.cardAlt },
                category === option.key && { borderColor: theme.tint, backgroundColor: theme.soft }
              ]}
              onPress={() => {
                dismissEntryKeyboard();
                setCategory(option.key);
                setCategoryTouched(true);
              }}
            >
              <Text style={[styles.chipText, { color: theme.muted }, category === option.key && { color: theme.tint }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>사용한 에너지(%)</Text>
      <View style={[styles.energyPanel, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <View style={styles.energyHeader}>
          <Text style={[styles.energyPercent, { color: theme.text }]}>{energy}%</Text>
          <View style={styles.energyScale}>
            <Text style={[styles.energyScaleText, { color: theme.muted }]}>적게 씀</Text>
            <View style={styles.energyScaleBar}>
              <Text style={[styles.energyScaleArrow, { color: theme.muted }]}>←</Text>
              <View style={[styles.energyScaleLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.energyScaleArrow, { color: theme.muted }]}>→</Text>
            </View>
            <Text style={[styles.energyScaleText, { color: theme.muted }]}>많이 씀</Text>
          </View>
        </View>
        <View
          ref={sliderRef}
          style={styles.sliderHitbox}
          onLayout={(event) => {
            setSliderWidth(event.nativeEvent.layout.width || 1);
            requestAnimationFrame(() => measureSlider());
          }}
          {...energyPanResponder.panHandlers}
        >
          <View style={[styles.sliderTrack, { backgroundColor: theme.soft }]}>
            <View
              style={[
                styles.sliderFill,
                {
                  width: `${energyValue}%`,
                  backgroundColor: energyLevel.color
                }
              ]}
            />
          </View>
          <View style={styles.sliderTicks}>
            {energyLevels.map((level) => (
              <View key={level.value} style={[styles.sliderTickButton, { left: `${level.value}%` }]}>
                <View style={[styles.sliderTick, { backgroundColor: theme.border }, energyValue >= level.value && { backgroundColor: energyLevel.color }]} />
              </View>
            ))}
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.sliderThumb,
              {
                left: `${energyValue}%`
              }
            ]}
          >
            <CloverBadge
              color={energyLevel.color}
              glowColor={energyLevel.glow}
              size={30}
              shadowOpacity={0.22}
            />
          </View>
        </View>
        <View style={styles.sliderLabels}>
          {energyLevels.map((level) => (
            <Text key={level.value} style={[styles.sliderLabel, { color: theme.muted, left: `${level.value}%` }]}>{level.value}</Text>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>감정</Text>
      <MoodGroup
        title="긍정 감정"
        moods={positiveExpanded ? positiveMoods : positiveMoods.slice(0, 6)}
        expanded={positiveExpanded}
        onToggle={() => setPositiveExpanded((current) => !current)}
        selected={mood}
        onSelect={(selectedMood) => {
          dismissEntryKeyboard();
          setMood(selectedMood);
        }}
        themeTint={theme.tint}
        themeSoft={theme.soft}
        themeText={theme.text}
        themeMuted={theme.muted}
        themeCard={theme.card}
        themeCardAlt={theme.cardAlt}
        themeBorder={theme.border}
      />
      <MoodGroup
        title="중간 감정"
        moods={neutralExpanded ? neutralMoods : neutralMoods.slice(0, 6)}
        expanded={neutralExpanded}
        onToggle={() => setNeutralExpanded((current) => !current)}
        selected={mood}
        onSelect={(selectedMood) => {
          dismissEntryKeyboard();
          setMood(selectedMood);
        }}
        themeTint={theme.tint}
        themeSoft={theme.soft}
        themeText={theme.text}
        themeMuted={theme.muted}
        themeCard={theme.card}
        themeCardAlt={theme.cardAlt}
        themeBorder={theme.border}
      />
      <MoodGroup
        title="부정 감정"
        moods={negativeExpanded ? negativeMoods : negativeMoods.slice(0, 6)}
        expanded={negativeExpanded}
        onToggle={() => setNegativeExpanded((current) => !current)}
        selected={mood}
        onSelect={(selectedMood) => {
          dismissEntryKeyboard();
          setMood(selectedMood);
        }}
        themeTint={theme.tint}
        themeSoft={theme.soft}
        themeText={theme.text}
        themeMuted={theme.muted}
        themeCard={theme.card}
        themeCardAlt={theme.cardAlt}
        themeBorder={theme.border}
      />

      <Text style={[styles.formHint, { color: theme.muted }]}>
        기록을 채우고 감정을 선택하면 '남기기' 버튼이 활성화 돼. 사용한 에너지 조정하는 것도 잊지 마!
      </Text>

      <Pressable
        disabled={!canSubmit}
        style={[styles.submit, { backgroundColor: theme.tint }, !canSubmit && styles.disabled]}
        onPress={() => {
          const text = textDraft.current.trim();
          if (!text || !mood) return;
          onAddEntry({
            id: createId(),
            text,
            mood,
            energy,
            createdAt: getNow().toISOString(),
            category
          });
          dismissEntryKeyboard();
          replaceInputText("");
          setMood(null);
          setCategory("other");
          setCategoryTouched(false);
          setEnergy(50);
          setPlaceholder(randomPlaceholder());
        }}
      >
        <Text style={[styles.submitText, { color: theme.inverseText }]}>남기기</Text>
      </Pressable>
    </Screen>
  );
}

function MoodGroup({
  title,
  moods,
  expanded,
  selected,
  onToggle,
  onSelect,
  themeTint,
  themeSoft,
  themeText,
  themeMuted,
  themeCard,
  themeCardAlt,
  themeBorder
}: {
  title: string;
  moods: Array<{ key: Mood; label: string }>;
  expanded: boolean;
  selected: Mood | null;
  onToggle: () => void;
  onSelect: (mood: Mood) => void;
  themeTint: string;
  themeSoft: string;
  themeText: string;
  themeMuted: string;
  themeCard: string;
  themeCardAlt: string;
  themeBorder: string;
}) {
  return (
    <View style={[styles.moodGroup, { borderColor: themeBorder, backgroundColor: themeCard }]}>
      <View style={styles.moodHeader}>
        <Text style={[styles.moodTitle, { color: themeText }]}>{title}</Text>
        <Pressable style={[styles.expandButton, { backgroundColor: themeSoft }]} onPress={onToggle}>
          <Text style={[styles.expandText, { color: themeTint }]}>{expanded ? "−" : "+"}</Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {moods.map((item) => {
          const separatorIndex = item.label.indexOf(" ");
          const emoji = separatorIndex >= 0 ? item.label.slice(0, separatorIndex) : "";
          const label = separatorIndex >= 0 ? item.label.slice(separatorIndex + 1) : item.label;

          return (
            <Pressable
              key={item.key}
              style={[
                styles.chip,
                styles.moodChip,
                { borderColor: themeBorder, backgroundColor: themeCardAlt },
                selected === item.key && { borderColor: themeTint, backgroundColor: themeSoft }
              ]}
              onPress={() => onSelect(item.key)}
            >
              {emoji ? (
                <Text allowFontScaling={false} style={styles.moodEmoji}>
                  {emoji}
                </Text>
              ) : null}
              <Text
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                style={[
                  styles.chipText,
                  styles.moodChipText,
                  { color: themeMuted },
                  selected === item.key && { color: themeTint }
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  textareaGroup: {
    gap: 6
  },
  textarea: {
    minHeight: 150,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#18241b",
    fontSize: 16,
    lineHeight: 23
  },
  characterCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    fontWeight: "700"
  },
  hints: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  hint: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#e7f6df"
  },
  hintText: {
    color: "#2f8f54",
    fontWeight: "800"
  },
  sectionTitle: {
    color: "#18241b",
    fontSize: 16,
    fontWeight: "900"
  },
  moodGroup: {
    gap: 9,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  categoryPanel: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  categoryHint: {
    color: "#8c948b",
    fontSize: 12,
    fontWeight: "700"
  },
  moodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  moodTitle: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "900"
  },
  expandButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e7f6df"
  },
  expandText: {
    color: "#2f8f54",
    fontSize: 18,
    fontWeight: "900"
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  chipText: {
    color: "#657064",
    fontWeight: "800"
  },
  moodChip: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  moodEmoji: {
    fontSize: 16,
    fontWeight: "400"
  },
  moodChipText: {
    fontSize: 14,
    lineHeight: 20
  },
  energyPanel: {
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  energyHeader: {
    gap: 8
  },
  energyPercent: {
    color: "#18241b",
    fontSize: 24,
    fontWeight: "900"
  },
  energyScale: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  energyScaleText: {
    color: "#657064",
    fontSize: 12,
    fontWeight: "900"
  },
  energyScaleBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0
  },
  energyScaleLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#a5afa4"
  },
  energyScaleArrow: {
    color: "#a5afa4",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 14
  },
  sliderHitbox: {
    position: "relative",
    height: 42,
    justifyContent: "center"
  },
  sliderTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#eef1ed",
    overflow: "hidden"
  },
  sliderFill: {
    height: "100%",
    borderRadius: 999
  },
  sliderTicks: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  },
  sliderTickButton: {
    position: "absolute",
    top: 0,
    width: 22,
    height: 42,
    marginLeft: -11,
    alignItems: "center",
    justifyContent: "center"
  },
  sliderTick: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cfd8ce"
  },
  sliderThumb: {
    position: "absolute",
    top: 6,
    width: 30,
    height: 30,
    marginLeft: -15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  sliderLabels: {
    position: "relative",
    height: 12
  },
  sliderLabel: {
    position: "absolute",
    top: 0,
    width: 28,
    marginLeft: -14,
    color: "#657064",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  formHint: {
    marginTop: -4,
    color: "#657064",
    fontSize: 13,
    fontWeight: "700"
  },
  submit: {
    alignItems: "center",
    paddingVertical: 15,
    borderRadius: 8,
    backgroundColor: "#18241b"
  },
  disabled: {
    opacity: 0.45
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900"
  }
});
