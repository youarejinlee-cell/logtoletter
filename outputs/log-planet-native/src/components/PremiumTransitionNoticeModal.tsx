import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export function PremiumTransitionNoticeModal({ visible, daysRemaining, onClose }: { visible: boolean; daysRemaining: number; onClose: () => void }) {
  return <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.modal}>
    <Text style={styles.eyebrow}>EARLY TRAVELER BENEFIT</Text>
    <Text style={styles.title}>기존 여행자에게 드리는 2주</Text>
    <Text style={styles.description}>앞으로 {daysRemaining}일 동안 행성, 분석 보기와 알림을 그대로 이용할 수 있어. 이후에도 기록과 모아보기, 지금까지 남긴 기록은 계속 무료야.</Text>
    <View style={styles.offer}><Text style={styles.offerTitle}>혜택 종료 후에도 체험 2주</Text><Text style={styles.offerText}>구독을 시작하면 2주 무료 체험 후 연 8,900원으로 자동 갱신돼.</Text></View>
    <Pressable accessibilityRole="button" style={styles.button} onPress={onClose}><Text style={styles.buttonText}>확인했어</Text></Pressable>
  </View></View></Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(3,7,24,0.78)" },
  modal: { width: "100%", maxWidth: 350, gap: 14, padding: 22, borderWidth: 1, borderColor: "rgba(191,228,255,0.4)", borderRadius: 8, backgroundColor: "#0b1b4d" },
  eyebrow: { color: "#9fd7ff", fontSize: 11, fontWeight: "900" }, title: { color: "#fff", fontSize: 22, lineHeight: 29, fontWeight: "900" },
  description: { color: "rgba(226,235,255,0.78)", fontSize: 14, lineHeight: 21, fontWeight: "700" },
  offer: { gap: 5, padding: 14, borderWidth: 1, borderColor: "rgba(159,215,255,0.26)", borderRadius: 8, backgroundColor: "rgba(159,215,255,0.1)" },
  offerTitle: { color: "#fff", fontSize: 14, fontWeight: "900" }, offerText: { color: "rgba(226,235,255,0.7)", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  button: { minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#bfe4ff" }, buttonText: { color: "#08112f", fontSize: 15, fontWeight: "900" }
});
