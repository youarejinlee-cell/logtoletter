import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Entry } from "../types/domain";
import { rewardDay, STAR_REWARDS, starBalance, StarWallet } from "../lib/starRewards";
type Props = { wallet: StarWallet; entries: Entry[]; status: string; isGuest: boolean; onBack: () => void; onRecord: () => void; onNotifications: () => void; onRefresh: () => void };
export function StarVaultScreen({ wallet, entries, status, isGuest, onBack, onRecord, onNotifications, onRefresh }: Props) {
 const today = rewardDay(new Date());
 const earned = new Set(wallet.transactions.map(t => t.id));
 const seen = new Set([...Object.keys(wallet.seenEntries), ...entries.map(e => e.id)]);
 const count = wallet.recordCount ?? seen.size;
 const days = wallet.firstMetAt ? Math.max(0, Math.floor((Date.now()-Date.parse(wallet.firstMetAt))/86400000)) : 0;
 const dailyDone = earned.has(`daily:v2:${today}`) || wallet.transactions.some(t => t.id.startsWith(`daily:${today}:`));
 const missions = [
  {id:`daily:v2:${today}`,title:"오늘 첫 기록",amount:1,done:dailyDone,progress:"매일 첫 기록에 1별 · 한국 시간 자정 초기화",action:onRecord,button:"기록하러 가기"},
  ...Object.entries(STAR_REWARDS.records).map(([n, amount])=>({id:`mission:v2:records:${n}`,title:`누적 ${n}번째 기록`,amount,done:earned.has(`mission:v2:records:${n}`),progress:`${Math.min(count,+n)} / ${n}개 · 날짜와 관계없이 한 번 지급`,action:onRecord,button:"기록하러 가기"})),
  ...Object.entries(STAR_REWARDS.days).map(([n, amount])=>({id:`mission:v2:days:${n}`,title:`로그플래닛과 만난 지 ${n}일`,amount,done:earned.has(`mission:v2:days:${n}`),progress:`${Math.min(days,+n)} / ${n}일 · 한 번 지급`,action:onRefresh,button:"달성 확인"})),
  {id:"mission:v2:notifications",title:"첫 알림 설정 완료",amount:5,done:earned.has("mission:v2:notifications"),progress:"알림 권한 허용 후 예약을 완료하면 한 번 지급",action:onNotifications,button:"알림 설정하기"},
 ];
 return <ScrollView contentContainerStyle={s.page}>
  <Pressable accessibilityRole="button" onPress={onBack}><Text style={s.link}>‹ 뒤로</Text></Pressable>
  <View style={s.balanceCard}><Text style={s.caption}>보유한 별</Text><Text style={s.balance}>★ {starBalance(wallet).toLocaleString()}</Text><Text style={s.text}>매일의 기록과 작은 약속으로 별을 모아보세요.</Text></View>
  {!!status && <Text accessibilityLiveRegion="polite" style={s.notice}>{status}</Text>}
  <Text style={s.heading}>별을 모으는 미션</Text>
  <Text style={s.text}>기록 보너스와 기념일 보너스는 각각 받을 수 있어요. 이미 받은 별은 기록을 지워도 다시 지급되지 않아요.</Text>
  {missions.map(m=><View key={m.id} style={s.card}><Text style={s.title}>{m.title} · +{m.amount} ★</Text><Text style={s.text}>{m.done?"적립 완료":m.progress}</Text><Pressable accessibilityRole="button" disabled={m.done} onPress={m.action} style={[s.button,m.done&&s.disabled]}><Text style={s.buttonText}>{m.done?"받은 별이에요":m.button}</Text></Pressable></View>)}
  <Text style={s.heading}>적립·사용 내역</Text>
  {!wallet.transactions.length && <Text style={s.text}>아직 별 내역이 없어요. 첫 기록으로 시작해보세요.</Text>}
  {[...wallet.transactions].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(t=><View key={t.id} style={s.transaction}><Text style={s.title}>{t.reason}</Text><Text style={s.gold}>{t.amount>0?"+":""}{t.amount} ★</Text><Text style={s.text}>{new Date(t.createdAt).toLocaleDateString("ko-KR")}</Text></View>)}
  <Text style={s.caption}>{isGuest?"게스트 별과 첫 만남 날짜는 이 기기에 저장되며 로그인 계정으로 합산되지 않아요.":"첫 만남은 계정 생성일 또는 더 이른 기존 기록일을 기준으로 해요. 오프라인 기록은 서버 동기화 후 반영돼요."}</Text>
  <Pressable accessibilityRole="button" onPress={onRefresh} style={s.button}><Text style={s.buttonText}>별 내역 새로고침</Text></Pressable>
 </ScrollView>;
}
const s=StyleSheet.create({page:{padding:20,gap:12,paddingBottom:24},link:{color:"#bfe4ff",fontSize:14},balanceCard:{padding:24,borderRadius:22,backgroundColor:"#172646",gap:10},balance:{fontSize:38,fontWeight:"800",color:"#ffe09a"},caption:{color:"#adc0db",fontSize:12,lineHeight:19},text:{color:"#bdcbe0",fontSize:13,lineHeight:21},heading:{color:"#fff",fontSize:18,fontWeight:"800",marginTop:10},title:{color:"#fff",fontSize:14,fontWeight:"700"},card:{backgroundColor:"#14213b",padding:16,borderRadius:16,gap:10},button:{backgroundColor:"#304665",padding:12,borderRadius:10},buttonText:{color:"#e3efff",textAlign:"center",fontWeight:"700"},disabled:{opacity:.5},notice:{color:"#ffcd91",lineHeight:20},gold:{color:"#ffe09a",fontWeight:"700"},transaction:{paddingVertical:12,gap:6,borderBottomWidth:1,borderBottomColor:"#293a55"}});
