import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../lib/theme";

export type TabKey = "universe" | "capture" | "calendar" | "inbox" | "collection" | "settings" | "account" | "appSettings" | "guide" | "dev";

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  cosmic?: boolean;
};

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "capture", label: "기록", icon: "📝" },
  { key: "calendar", label: "캘린더", icon: "📅" },
  { key: "universe", label: "우주", icon: "🪐" },
  { key: "collection", label: "분석 보기", icon: "📊" },
  { key: "settings", label: "알림", icon: "🔔" }
];

export function BottomTabs({ active, onChange, cosmic }: Props) {
  const theme = useAppTheme();
  const wrapStyle = cosmic
    ? { borderTopColor: "rgba(255,255,255,0.14)", backgroundColor: "#101844" }
    : { borderTopColor: theme.border, backgroundColor: theme.page };

  return (
    <View style={[styles.wrap, wrapStyle]}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.item, active === tab.key && { backgroundColor: cosmic ? "rgba(255,255,255,0.16)" : theme.soft }]}
        >
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text
            style={[
              styles.label,
              { color: cosmic ? "rgba(238,242,255,0.62)" : theme.muted },
              active === tab.key && { color: cosmic ? "#fff" : theme.tint }
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 6,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#dfe8da",
    backgroundColor: "#fbfdf8"
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 8,
    borderRadius: 8
  },
  icon: {
    fontSize: 17
  },
  label: {
    color: "#657064",
    fontSize: 10,
    fontWeight: "800"
  }
});
