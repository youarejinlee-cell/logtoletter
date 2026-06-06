import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { energyPalettes } from "../lib/energyColors";
import { themePalettes } from "../lib/theme";
import { CalendarEnergyMode, ColorTheme, EnergyColorMode } from "../types/domain";

type Props = {
  theme: ColorTheme;
  energyColorMode: EnergyColorMode;
  calendarEnergyMode: CalendarEnergyMode;
  onChangeTheme: (theme: ColorTheme) => void;
  onChangeEnergyColorMode: (mode: EnergyColorMode) => void;
  onChangeCalendarEnergyMode: (mode: CalendarEnergyMode) => void;
};

const calendarEnergyOptions: Array<{ key: CalendarEnergyMode; label: string }> = [
  { key: "first", label: "그날 처음으로 고른 에너지" },
  { key: "last", label: "그날 마지막으로 고른 에너지" },
  { key: "most", label: "그날 가장 많이 고른 에너지" }
];

export function AppSettingsScreen({
  theme,
  energyColorMode,
  calendarEnergyMode,
  onChangeTheme,
  onChangeEnergyColorMode,
  onChangeCalendarEnergyMode
}: Props) {
  return (
    <Screen eyebrow="Settings" title="설정" lead="앱의 색감을 고를 수 있어.">
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>컬러 테마</Text>
        <View style={styles.themeGrid}>
          {(Object.keys(themePalettes) as ColorTheme[]).map((key) => (
            <Pressable
              key={key}
              style={[
                styles.themeButton,
                { borderColor: themePalettes[key].border, backgroundColor: themePalettes[key].soft },
                theme === key && { borderColor: themePalettes[key].tint, borderWidth: 2 }
              ]}
              onPress={() => onChangeTheme(key)}
            >
              <View style={[styles.themeSwatch, { backgroundColor: themePalettes[key].tint }]} />
              <Text style={styles.themeButtonText}>{themePalettes[key].label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>에너지 팔레트</Text>
        <View style={styles.energyModeList}>
          {(Object.keys(energyPalettes) as EnergyColorMode[]).map((key) => (
            <Pressable
              key={key}
              style={[
                styles.energyModeButton,
                { borderColor: themePalettes[theme].border, backgroundColor: "#fff" },
                energyColorMode === key && { borderColor: themePalettes[theme].tint, backgroundColor: themePalettes[theme].soft, borderWidth: 2 }
              ]}
              onPress={() => onChangeEnergyColorMode(key)}
            >
              <Text style={styles.energyModeLabel}>{energyPalettes[key].label}</Text>
              <View style={styles.energyChipRow}>
                {energyPalettes[key].levels.map((level) => (
                  <View key={level.value} style={[styles.energyChip, { backgroundColor: level.color }]}>
                    <Text style={[styles.energyChipText, { color: level.textColor }]}>{level.value}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>캘린더에서 날짜 선택 시 에너지 표시</Text>
        <View style={styles.calendarEnergyList}>
          {calendarEnergyOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.calendarEnergyButton,
                { borderColor: themePalettes[theme].border, backgroundColor: "#fff" },
                calendarEnergyMode === option.key && { borderColor: themePalettes[theme].tint, backgroundColor: themePalettes[theme].soft, borderWidth: 2 }
              ]}
              onPress={() => onChangeCalendarEnergyMode(option.key)}
            >
              <Text style={styles.calendarEnergyText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
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
    borderRadius: 999
  },
  themeButtonText: {
    color: "#18241b",
    fontWeight: "900"
  },
  energyModeList: {
    gap: 10
  },
  energyModeButton: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8
  },
  energyModeLabel: {
    color: "#18241b",
    fontSize: 14,
    fontWeight: "900"
  },
  energyChipRow: {
    flexDirection: "row",
    gap: 8
  },
  energyChip: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 999
  },
  energyChipText: {
    fontSize: 12,
    fontWeight: "900"
  },
  calendarEnergyList: {
    gap: 8
  },
  calendarEnergyButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8
  },
  calendarEnergyText: {
    color: "#18241b",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20
  }
});
