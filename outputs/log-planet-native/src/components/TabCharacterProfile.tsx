import { Image, StyleSheet, View } from "react-native";
import type { TabKey } from "./BottomTabs";

const portraits = {
  capture: { name: "로나", source: require("../../../../../character/assets/characters/rona-profile-v2-vermilion-eye-smile.png") },
  universe: { name: "로미", source: require("../../../../../character/assets/characters/romi-profile-standard.png") },
  collection: { name: "로기", source: require("../../../../../character/assets/characters/rogi-profile-v4-comma-hair.png") },
  settings: { name: "로아", source: require("../../../../../character/assets/characters/roa-profile-v1.png") },
};

export function TabCharacterProfile({ tab }: { tab: TabKey }) {
  if (tab === "calendar") return (
    <View style={styles.group} accessible accessibilityRole="image" accessibilityLabel="기록을 지키는 그록과 프록">
      <View style={styles.circle}>
        <Image source={require("../../assets/assets_v5/deco/deco_grok.png")} style={[styles.guard, styles.grok]} resizeMode="contain" />
        <Image source={require("../../assets/assets_v5/deco/deco_prok.png")} style={[styles.guard, styles.prok]} resizeMode="contain" />
      </View>
    </View>
  );
  const portrait = portraits[tab as keyof typeof portraits];
  if (!portrait) return null;
  return (
    <View style={styles.group} accessible accessibilityRole="image" accessibilityLabel={portrait.name}>
      <View style={styles.circle}><Image source={portrait.source} style={styles.image} resizeMode="cover" /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { width: 56, height: 56, marginRight: 10, alignItems: "center", justifyContent: "center" },
  circle: { width: 50, height: 50, borderRadius: 25, overflow: "hidden", borderWidth: 1.5, borderColor: "#a9c9ee", backgroundColor: "#172746" },
  image: { width: "100%", height: "100%" },
  guard: { width: 29, height: 39, position: "absolute", top: 5 },
  grok: { left: -1 },
  prok: { right: -1 },
});
