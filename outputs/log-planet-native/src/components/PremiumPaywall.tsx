import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = {
  subscribed: boolean;
  gifted?: boolean;
  trialStatus: string;
  canSubscribe: boolean;
  onContinue: () => void;
  loggedIn: boolean;
  loading: boolean;
  configured: boolean;
  price?: string | null;
  error?: string | null;
  onPurchase: () => void;
  onRestore: () => void;
  onLogin: () => void;
};

export function PremiumPaywall({ subscribed, gifted = false, trialStatus, canSubscribe, onContinue, loggedIn, loading, configured, price, error, onPurchase, onRestore, onLogin }: Props) {
  const displayPrice = price ? `연 ${price}` : "가격 확인 중";
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View style={styles.orbit} />
        <Text style={styles.planet}>🪐</Text>
        <Text style={styles.eyebrow}>LOG PLANET</Text>
        <Text style={styles.title}>우리의 기록을 계속 이어가자</Text>
        <Text style={styles.description}>하나의 연간 구독으로 기록, 행성, 분석과 알림을 모두 이용할 수 있어.</Text>
      </View>
      <View style={styles.benefits}>
        <Benefit icon="🪐" title="나만의 행성" description="기록의 카테고리와 감정으로 완성되는 행성" />
        <Benefit icon="📊" title="기록 분석" description="감정과 에너지, 카테고리를 한눈에 확인" />
        <Benefit icon="🔔" title="기록 알림" description="놓치기 쉬운 순간을 나에게 맞는 시간에 기록" />
      </View>
      <View style={styles.offer}>
        <Text style={styles.offerTitle}>{trialStatus}</Text>
        {!gifted && <Text style={styles.offerPrice}>{displayPrice}</Text>}
        <Text style={styles.offerNote}>{gifted ? "관리자가 선물한 기간제 이용권이에요. 만료 후 자동 결제되지 않아요." : "30일 체험은 자동 결제되지 않아. 직접 연간 구독을 신청하면 스토어에 표시된 조건으로 결제되고 매년 자동 갱신돼. 갱신 전 스토어에서 취소할 수 있어."}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!configured ? <Text style={styles.setupNotice}>결제 상품 연결을 준비하고 있어. 잠시 후 다시 확인해줘.</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={loading || !canSubscribe || (loggedIn && (!configured || !price))}
        style={[styles.primaryButton, (loading || !canSubscribe || (loggedIn && (!configured || !price))) && styles.disabled]}
        onPress={loggedIn ? onPurchase : onLogin}
      >
        {loading ? <ActivityIndicator color="#08112f" /> : null}
        <Text style={styles.primaryText}>{subscribed ? (gifted ? "이벤트 이용권 이용 중" : "연간 구독 이용 중") : !canSubscribe ? "체험 종료 후 구독할 수 있어" : loggedIn ? "연간 구독 신청하기" : "로그인하고 구독하기"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={loading || !configured} style={styles.restoreButton} onPress={onRestore}>
        <Text style={styles.restoreText}>구매 복원</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.restoreButton} onPress={onContinue}>
        <Text style={styles.restoreText}>기록과 행성 보러 가기</Text>
      </Pressable>
      <Text style={styles.footnote}>이용기간이 끝나도 기존 기록의 열람·내보내기와 행성 감상은 가능해. 새 기록과 분석을 이어가려면 구독이 필요해.</Text>
    </ScrollView>
  );
}

function Benefit({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <View style={styles.benefit}><Text style={styles.benefitIcon}>{icon}</Text><View style={styles.benefitCopy}><Text style={styles.benefitTitle}>{title}</Text><Text style={styles.benefitDescription}>{description}</Text></View></View>;
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 80, gap: 16 },
  hero: { alignItems: "center", overflow: "hidden", paddingHorizontal: 18, paddingVertical: 26, borderWidth: 1, borderColor: "rgba(159,215,255,0.34)", borderRadius: 8, backgroundColor: "#0b1b4d" },
  orbit: { position: "absolute", top: 48, width: 210, height: 76, borderWidth: 1, borderColor: "rgba(159,215,255,0.3)", borderRadius: 999, transform: [{ rotate: "-12deg" }] },
  planet: { fontSize: 62, marginBottom: 10 },
  eyebrow: { color: "#9fd7ff", fontSize: 11, fontWeight: "900" },
  title: { marginTop: 8, color: "#fff", fontSize: 23, lineHeight: 30, fontWeight: "900", textAlign: "center" },
  description: { marginTop: 10, color: "rgba(226,235,255,0.76)", fontSize: 14, lineHeight: 21, fontWeight: "700", textAlign: "center" },
  benefits: { gap: 1, overflow: "hidden", borderWidth: 1, borderColor: "rgba(226,235,255,0.18)", borderRadius: 8, backgroundColor: "rgba(226,235,255,0.18)" },
  benefit: { minHeight: 74, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#101844" },
  benefitIcon: { width: 34, fontSize: 24, textAlign: "center" },
  benefitCopy: { flex: 1, gap: 3 },
  benefitTitle: { color: "#f7f9ff", fontSize: 15, fontWeight: "900" },
  benefitDescription: { color: "rgba(226,235,255,0.68)", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  offer: { alignItems: "center", gap: 5, padding: 17, borderWidth: 1, borderColor: "rgba(159,215,255,0.28)", borderRadius: 8, backgroundColor: "rgba(159,215,255,0.1)" },
  offerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  offerPrice: { color: "#bfe4ff", fontSize: 15, fontWeight: "900" },
  offerNote: { marginTop: 3, color: "rgba(226,235,255,0.66)", fontSize: 11, lineHeight: 16, fontWeight: "700", textAlign: "center" },
  error: { color: "#ffb4ab", fontSize: 12, lineHeight: 18, fontWeight: "800", textAlign: "center" },
  setupNotice: { color: "#ffd99f", fontSize: 12, lineHeight: 18, fontWeight: "800", textAlign: "center" },
  primaryButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#bfe4ff" },
  primaryText: { color: "#08112f", fontSize: 16, fontWeight: "900", textAlign: "center" },
  disabled: { opacity: 0.48 },
  restoreButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  restoreText: { color: "#bfe4ff", fontSize: 13, fontWeight: "900" },
  footnote: { color: "rgba(226,235,255,0.58)", fontSize: 11, lineHeight: 17, fontWeight: "700", textAlign: "center" }
});
