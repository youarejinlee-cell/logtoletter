import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { STAR_REWARDS, StarWallet, starBalance } from "../lib/starRewards";

export function StarWalletButton({ wallet, status, isGuest, onRefresh }: { wallet: StarWallet; status: string; isGuest: boolean; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const transactions = [...wallet.transactions].reverse();
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`별 ${starBalance(wallet)}개, 별 내역 보기`} onPress={() => { setOpen(true); onRefresh(); }} style={{ backgroundColor: "#152347", paddingHorizontal: 18, paddingVertical: 10 }}>
      <Text style={{ color: "#ffe09a", fontWeight: "700" }}>★ {starBalance(wallet)}개 · 나의 별</Text>
      {!!status && <Text style={{ color: "#bdd0eb", fontSize: 11, marginTop: 3 }}>{status}</Text>}
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#0009" }}>
        <View style={{ maxHeight: "80%", backgroundColor: "#14213b", borderRadius: 20, padding: 22 }}>
          <Text accessibilityRole="header" style={{ color: "#ffe09a", fontSize: 25, fontWeight: "700" }}>★ {starBalance(wallet)}개</Text>
          <Text style={{ color: "#d9e4f5", lineHeight: 23, marginVertical: 12 }}>매일 첫 기록 +1 · 누적 5/10/20/109개 +1/+2/+3/+10{"\n"}첫 만남 30/109일 +3/+10 · 첫 알림 설정 +5{"\n"}각 누적 미션은 한 번씩 지급해요.</Text>
          <Text style={{ color: "#a9bdd9", marginBottom: 12 }}>{isGuest ? "이 기기에 저장되는 별이에요. 게스트 별은 로그인 계정으로 합산되지 않아요." : "서버에서 확인된 별이에요. 오프라인 기록의 보상은 동기화가 끝나면 표시돼요."}</Text>
          {!!status && <Text accessibilityLiveRegion="polite" style={{ color: "#ffd2a6", marginBottom: 12 }}>{status}</Text>}
          <ScrollView><Text style={{ color: "#fff", fontWeight: "700", marginBottom: 10 }}>별 내역</Text>
            {!transactions.length && <Text style={{ color: "#a9bdd9", paddingVertical: 18 }}>첫 기록을 남기고 별을 모아보세요.</Text>}
            {transactions.map(t => <View key={t.id} style={{ borderBottomWidth: 1, borderBottomColor: "#35425a", paddingVertical: 12 }}>
              <Text style={{ color: "#fff" }}>{t.reason} <Text style={{ color: "#ffe09a" }}>{t.amount > 0 ? "+" : ""}{t.amount} ★</Text></Text>
              <Text style={{ color: "#9db0c9", fontSize: 12 }}>{new Date(t.createdAt).toLocaleString("ko-KR")}</Text>
            </View>)}
          </ScrollView>
          {!isGuest && <Pressable accessibilityRole="button" onPress={onRefresh} style={{ padding: 12 }}><Text style={{ color: "#a9d7ff", textAlign: "center" }}>별 내역 다시 확인</Text></Pressable>}
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ padding: 14, backgroundColor: "#304a69", borderRadius: 12, marginTop: 8 }}><Text style={{ color: "#fff", textAlign: "center" }}>닫기</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}
