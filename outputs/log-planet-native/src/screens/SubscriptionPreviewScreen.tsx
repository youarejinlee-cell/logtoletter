import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PremiumPaywall } from "../components/PremiumPaywall";
import { accessStatusLabel, getAccessState } from "../lib/accessPolicy";

const modes = [
  { id: "subscribed", label: "연간 구독 활성" },
  { id: "trial", label: "미구독 · 체험 중" },
  { id: "expired", label: "미구독 · 체험 종료" },
] as const;
type Mode = typeof modes[number]["id"];

// Presentation only: never replaces the real entitlement or calls a billing API.
export function SubscriptionPreviewScreen({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("subscribed");
  const [notice, setNotice] = useState("");
  const now = new Date();
  const startedAt = new Date(now.getTime() - (mode === "trial" ? 23 : 31) * 86400000).toISOString();
  const access = getAccessState(startedAt, mode === "subscribed", now);
  return <View style={styles.page}>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" onPress={onClose}><Text style={styles.back}>‹ 테스트 콘솔</Text></Pressable>
      <Text style={styles.title}>구독 화면 미리보기</Text>
      <Text style={styles.note}>화면 비교 전용 · 실제 구독, 별, 결제 내역은 변경되지 않아요.</Text>
      <View style={styles.tabs}>{modes.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: mode === item.id }} onPress={() => { setMode(item.id); setNotice(""); }} style={[styles.tab, mode === item.id && styles.selected]}><Text style={styles.tabText}>{item.label}</Text></Pressable>)}</View>
      <Text style={styles.status}>{accessStatusLabel(access)}</Text>
      <Text style={styles.note}>{access.canCreate ? "새 기록 · 분석 · 알림 이용 가능" : "기존 기록 · 행성 열람 가능 / 새 기록 · 분석 · 알림은 구독 필요"}</Text>
      {!!notice && <Text accessibilityLiveRegion="polite" style={styles.status}>{notice}</Text>}
    </View>
    <PremiumPaywall key={mode} subscribed={mode === "subscribed"} trialStatus={accessStatusLabel(access)} canSubscribe={mode === "expired"} loggedIn configured loading={false} price="스토어 가격 (미리보기)" onPurchase={() => setNotice("실제 앱에서는 스토어 결제 화면으로 이동해요. 미리보기에서는 결제하지 않아요.")} onRestore={() => setNotice("실제 앱에서는 기존 구매를 확인해요. 미리보기에서는 구매 조회를 실행하지 않아요.")} onLogin={() => {}} onContinue={onClose} />
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  controls: { padding: 16, gap: 9, backgroundColor: "#101a3c" },
  back: { color: "#bfe4ff", fontSize: 13 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  note: { color: "#b3c0da", fontSize: 12, lineHeight: 18 },
  tabs: { flexDirection: "row", gap: 6 },
  tab: { flex: 1, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 10, backgroundColor: "#253351", justifyContent: "center" },
  selected: { backgroundColor: "#425a7b", borderColor: "#bfe4ff", borderWidth: 1 },
  tabText: { color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" },
  status: { color: "#ffe09a", fontSize: 12, lineHeight: 18 },
});
