import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LOG_FRIEND_IDS, LOG_FRIEND_NAMES, LOG_FRIEND_PRICE, LogFriendId } from "../lib/logFriends";
import { logFriendPoseArtwork } from "../lib/logFriendArtwork";
import { planetArtwork } from "../lib/planetArtwork";
import { ownsLogFriend, starBalance, StarWallet } from "../lib/starRewards";


const personalities: Record<LogFriendId, { role: string; description: string; object: string }> = {
  romi: { role: "순간을 소중히 품는 관찰자", description: "작은 이야기도 다정하게 받아주는 친구예요. 서두르거나 판단하지 않고, 당신의 순간을 조심스럽게 보살펴요.", object: "별빛을 품은 기록구슬" },
  rogi: { role: "마음을 들여다보는 분석가", description: "차분하게 기록을 살피며 그 안의 패턴을 찾아요. 다른 이의 마음에는 섬세하지만, 자기 마음 앞에서는 조금 서툴러요.", object: "생각을 이어가는 별 연필" },
  roa: { role: "기록할 순간을 기다리는 시간지기", description: "작은 약속도 꼼꼼히 챙기는 친구예요. 때로는 허술한 모습을 보이지만, 당신의 기록을 참을성 있게 기다려요.", object: "순간을 알려주는 별 시계" },
  rona: { role: "이야기를 나누는 다정한 순찰자", description: "새로운 만남과 이야기를 좋아해요. 신나게 이야기하면서도 친구들의 반응을 세심하게 살피는 다정한 친구예요.", object: "이야기를 전하는 별 확성기" }
};
type Props = { embedded?: boolean; onOpenVault: () => void; wallet: StarWallet; busy: boolean; status: string; isGuest: boolean; onBack: () => void; onFriend: (id: LogFriendId, purchase: boolean) => void; onRefresh: () => void };
export function ShopScreen({ embedded = false, onOpenVault, wallet, busy, status, isGuest, onBack, onFriend, onRefresh }: Props) {
  const [tab, setTab] = useState<"friends" | "planets">("friends");
  const [focused, setFocused] = useState<LogFriendId>(wallet.selectedFriend ?? "romi");
  const [confirm, setConfirm] = useState<LogFriendId | null>(null);
  const { height, width } = useWindowDimensions();
  const balance = starBalance(wallet), owned = ownsLogFriend(wallet, focused);
  const selected = (wallet.selectedFriend ?? "romi") === focused;
  const insufficient = !owned && balance < LOG_FRIEND_PRICE;
  const personality = personalities[focused];
  return <View style={s.root}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="행성으로 돌아가기" onPress={onBack} style={s.back}><Text style={s.text}>‹ 행성</Text></Pressable>
      {!embedded && <Text accessibilityRole="header" style={s.title}>행성 꾸미기</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={`별 ${balance}개, 별 보관소 열기`} onPress={onOpenVault}><Text style={s.balance}>★ {balance.toLocaleString()}</Text></Pressable>
    </View>
    <View accessibilityRole="tablist" style={s.tabs}>{([{ key: "friends", label: "로그프렌즈" }, { key: "planets", label: "플래닛" }] as const).map(item =>
      <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={[s.tab, tab === item.key && s.activeTab]}>
        <Text style={[s.tabText, tab === item.key && s.activeTabText]}>{item.label}</Text>
      </Pressable>
    )}</View>
    <ScrollView contentContainerStyle={s.content}>
      {tab === "friends" ? <>
        <Text style={s.eyebrow}>나의 행성을 함께 지킬 친구</Text>
        <View style={s.card}>
          <View style={s.cardTop}><Text style={s.badge}>{selected ? "지금 함께하는 친구" : owned ? "보유한 친구" : "★ 50 · 새로운 친구"}</Text><Text style={s.page}>{LOG_FRIEND_IDS.indexOf(focused) + 1} / 4</Text></View>
          <View style={[s.art, { height: Math.min(250, Math.max(170, height * 0.25)) }]}><View style={s.glow}/><Image source={logFriendPoseArtwork[focused].standing} accessibilityLabel={`${LOG_FRIEND_NAMES[focused]} · ${personality.object}`} resizeMode="contain" style={s.image} /></View>
          <Text accessibilityRole="header" style={s.name}>{LOG_FRIEND_NAMES[focused]}</Text>
          <Text style={s.role}>{personality.role}</Text>
          <Text style={s.description}>{personality.description}</Text>
          <Text style={s.object}>{personality.object}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${LOG_FRIEND_NAMES[focused]} ${selected ? "함께하는 중" : owned ? "행성에 배치" : "50별에 구매"}`} accessibilityState={{ disabled: busy || selected || insufficient }} disabled={busy || selected || insufficient} onPress={() => owned ? onFriend(focused, false) : setConfirm(focused)} style={[s.action, (busy || selected || insufficient) && s.disabled]}>
            <Text style={s.actionText}>{busy ? "잠시만 기다려 주세요…" : selected ? "함께하는 중" : owned ? "행성에 배치" : "★ 50 · 초대하기"}</Text>
          </Pressable>
          {insufficient && <Text style={s.shortage}>별 {LOG_FRIEND_PRICE - balance}개 더 모으면 만날 수 있어요</Text>}
        </View>
        <View style={s.listHeading}><Text style={s.listTitle}>다른 친구 만나보기</Text><Text style={s.hint}>옆으로 넘겨보세요 →</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.friendList} accessibilityLabel="로그프렌즈 가로 목록">{LOG_FRIEND_IDS.map(id => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${LOG_FRIEND_NAMES[id]} 자세히 보기`} accessibilityState={{ selected: focused === id }} onPress={() => setFocused(id)} style={[s.thumbnail, { width: Math.max(102, (Math.min(width, 560) - 60) / 3.2) }, focused === id && s.activeThumbnail]}>
          <Image source={logFriendPoseArtwork[id].standing} resizeMode="contain" style={s.thumbImage}/>
          <Text style={[s.thumbName, focused === id && s.activeTabText]}>{LOG_FRIEND_NAMES[id]}</Text>
          <Text style={s.thumbState}>{(wallet.selectedFriend ?? "romi") === id ? "함께하는 중" : ownsLogFriend(wallet, id) ? "보유 중" : "★ 50"}</Text>
        </Pressable>)}</ScrollView>
      </> : <>
        <Text style={s.eyebrow}>나의 기록이 자라는 곳</Text>
        <View style={s.card}>
          <View style={s.cardTop}><Text style={s.badge}>기본 플래닛 · 보유 중</Text></View>
          <Image source={planetArtwork.base} accessibilityLabel="초록 대륙과 강이 있는 기본 플래닛" resizeMode="contain" style={s.planetImage}/>
          <Text style={s.name}>나의 로그플래닛</Text><Text style={s.role}>기록할수록 풍성해지는 작은 세계</Text>
          <Text style={s.description}>하나씩 쌓인 기록이 행성의 풍경이 돼요. 로그프렌즈와 함께 나만의 이야기를 채워보세요.</Text>
          <View style={s.ownedPlanet}><Text style={s.activeTabText}>지금 사용 중</Text></View>
        </View>
        <Text style={s.note}>새로운 플래닛 스킨은 준비 중이에요.</Text>
      </>}
      {!!status && <Text accessibilityLiveRegion="polite" style={s.status}>{status}</Text>}
      <View style={s.wallet}></View>
    </ScrollView>
    <Modal visible={confirm !== null} transparent animationType="fade" onRequestClose={() => setConfirm(null)}><View style={s.confirmBackdrop}><View accessibilityRole="alert" style={s.confirm}>
      <Text style={s.text}>{LOG_FRIEND_NAMES[confirm ?? "romi"]}를 별 50개로 초대할까요?</Text>
      <Text style={s.confirmDescription}>구매 후 남는 별 {balance - LOG_FRIEND_PRICE}개 · 행성에 바로 배치돼요.</Text>
      <View style={s.confirmActions}>
        <Pressable accessibilityRole="button" onPress={() => setConfirm(null)} style={s.back}><Text style={s.text}>취소</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy || balance < LOG_FRIEND_PRICE} onPress={() => { if (confirm) onFriend(confirm, true); setConfirm(null); }} style={s.action}><Text style={s.actionText}>50별로 구매</Text></Pressable>
      </View>
    </View></View></Modal>
  </View>;
}
const s = StyleSheet.create({
 root:{flex:1,backgroundColor:"#080f25"},header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:14,paddingVertical:12},back:{padding:10},text:{color:"#dbe7ff",fontSize:15},title:{color:"#fff",fontSize:19,fontWeight:"800"},balance:{color:"#ffe09a",fontSize:16,fontWeight:"800",minWidth:65,textAlign:"right"},
 tabs:{flexDirection:"row",marginHorizontal:20,padding:4,borderRadius:16,backgroundColor:"#142038",maxWidth:560,width:"90%",alignSelf:"center"},tab:{flex:1,alignItems:"center",paddingVertical:12,borderRadius:12},activeTab:{backgroundColor:"#2a3952"},tabText:{color:"#95a6c2",fontSize:15,fontWeight:"700"},activeTabText:{color:"#ffe09a"},
 content:{paddingHorizontal:20,paddingBottom:36,width:"100%",maxWidth:560,alignSelf:"center"},eyebrow:{color:"#9eafc8",fontSize:12,textAlign:"center",marginVertical:16,letterSpacing:1},card:{borderRadius:26,padding:20,borderWidth:1,borderColor:"#3c4964",backgroundColor:"#152139"},cardTop:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},badge:{color:"#e9d399",fontSize:11},page:{color:"#8799b8",fontSize:11},art:{alignItems:"center",justifyContent:"center",marginTop:12,marginBottom:8},glow:{position:"absolute",width:170,height:170,borderRadius:85,backgroundColor:"#26334b"},image:{width:"100%",height:"100%"},name:{color:"#fff",fontSize:27,fontWeight:"800",textAlign:"center"},role:{color:"#e7d5ab",fontSize:13,textAlign:"center",marginTop:6},description:{color:"#b5c3da",fontSize:13,lineHeight:21,textAlign:"center",marginTop:12},object:{color:"#8299b8",fontSize:11,textAlign:"center",marginTop:10,marginBottom:16},action:{backgroundColor:"#ffe09a",paddingVertical:13,paddingHorizontal:16,borderRadius:13,alignItems:"center"},actionText:{color:"#202a42",fontWeight:"800",fontSize:14},disabled:{opacity:0.45},shortage:{color:"#aebbd5",fontSize:11,textAlign:"center",marginTop:9},listHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:22,marginBottom:12},listTitle:{color:"#dbe7ff",fontSize:13,fontWeight:"700"},hint:{color:"#8194b4",fontSize:11},friendList:{gap:10,paddingBottom:6},thumbnail:{width:102,padding:10,alignItems:"center",borderWidth:1,borderColor:"#2b3955",backgroundColor:"#111c32",borderRadius:18},activeThumbnail:{borderColor:"#efd48e",backgroundColor:"#24314a"},thumbImage:{width:78,height:91},thumbName:{color:"#dce7f8",fontSize:13,fontWeight:"700",marginTop:6},thumbState:{color:"#8fa4c4",fontSize:10,marginTop:5},planetImage:{width:"100%",height:280,marginVertical:20},ownedPlanet:{alignItems:"center",padding:14,marginTop:20,borderRadius:12,backgroundColor:"#26334b"},note:{color:"#93a6c3",fontSize:13,textAlign:"center",marginTop:20},status:{color:"#ffe09a",marginTop:16,lineHeight:21},wallet:{marginTop:24},confirmBackdrop:{flex:1,justifyContent:"center",padding:24,backgroundColor:"#000a"},confirm:{width:"100%",maxWidth:440,alignSelf:"center",padding:20,borderRadius:20,backgroundColor:"#253452"},confirmDescription:{color:"#aebbd5",fontSize:13,lineHeight:21,marginVertical:16},confirmActions:{flexDirection:"row",justifyContent:"flex-end",gap:12}
});
