import { randomCompanionMessage } from "../lib/companionMessages";
import { Image, Pressable, Text, View } from "react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { LogFriendId, LOG_FRIEND_NAMES } from "../lib/logFriends";
import { logFriendPoseArtwork } from "../lib/logFriendArtwork";
import { planetArtwork } from "../lib/planetArtwork";
import { approvedCompanionPose, planetCompanionOverrides } from "../lib/planetCompanionOverrides";
const SPEECH_BUBBLE_BACKGROUND = "rgba(255, 248, 233, 0.8)";

export const LogFriendContext = createContext<LogFriendId>("romi");

export function PlanetCompanion({ width, height }: { width: number; height: number }) {
  const friend = useContext(LogFriendContext);
  if (!planetArtwork.companion) return null;
  const pose = approvedCompanionPose;
  const p = planetCompanionOverrides[`${friend}/${pose}`];
  return <View pointerEvents="none" style={{ position: "absolute",
    left: (p.center.x - p.anchor.x * p.scale) / 1126 * width,
    top: (p.center.y - p.anchor.y * p.scale) / 1397 * height,
    width: p.canvas.width * p.scale / 1126 * width,
    height: p.canvas.height * p.scale / 1397 * height
  }}><Image accessibilityLabel={LOG_FRIEND_NAMES[friend]} source={logFriendPoseArtwork[friend][pose]}
    style={{ width: "100%", height: "100%" }} resizeMode="contain" fadeDuration={0} /></View>;
}

// Render after the scenery so the hit area and speech bubble remain reachable.
export function PlanetCompanionInteraction({ width, height }: { width: number; height: number }) {
  const friend = useContext(LogFriendContext);
  const [message, setMessage] = useState<string>(() => randomCompanionMessage(friend));
  useEffect(() => { setMessage(randomCompanionMessage(friend)); }, [friend]);
  const p = planetCompanionOverrides[`${friend}/${approvedCompanionPose}`];
  const frame = { left: (p.center.x-p.anchor.x*p.scale)/1126*width, top: (p.center.y-p.anchor.y*p.scale)/1397*height, width:p.canvas.width*p.scale/1126*width, height:p.canvas.height*p.scale/1397*height };
  // Follow each friend's approved frame and keep the bubble on its upper right.
  const bubbleLeft = frame.left + frame.width * .9;
  const bubbleWidth = Math.min(220, width - bubbleLeft - 8);
  const bubbleTop = frame.top - 9;
  const speak = () => setMessage(previous => randomCompanionMessage(friend, previous));
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${LOG_FRIEND_NAMES[friend]}에게 말 걸기`} onPress={speak} style={{position:"absolute",...frame}} />
    {!!message && <View style={{position:"absolute",left:bubbleLeft,top:bubbleTop,width:bubbleWidth,zIndex:100}}>
      <View style={{padding:13,borderRadius:16,backgroundColor:SPEECH_BUBBLE_BACKGROUND,borderWidth:1,borderColor:"rgba(239, 216, 164, 0.6)"}}>
        <Text accessibilityLiveRegion="polite" style={{color:"#20304e",fontSize:13,lineHeight:20}}>{message}</Text>
        <View pointerEvents="none" style={{position:"absolute",left:-8,top:18,width:0,height:0,borderTopWidth:7,borderBottomWidth:7,borderRightWidth:8,borderTopColor:"transparent",borderBottomColor:"transparent",borderRightColor:SPEECH_BUBBLE_BACKGROUND}} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="말풍선 닫기" onPress={() => setMessage("")} style={{alignSelf:"flex-end",minHeight:44,minWidth:60,alignItems:"center",justifyContent:"center"}}>
        <Text style={{color:"#fff8e9",fontSize:12,fontWeight:"600",textShadowColor:"rgba(0, 0, 0, 0.8)",textShadowOffset:{width:0,height:1},textShadowRadius:3}}>X 닫기</Text>
      </Pressable>
    </View>}
  </>;
}
