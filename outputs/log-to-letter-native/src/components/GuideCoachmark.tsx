import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabKey } from "./BottomTabs";

export type GuideStep = {
  tab: TabKey;
  body: string;
  image: ImageSourcePropType;
};

export const interactiveGuideSteps: GuideStep[] = [
  {
    tab: "capture",
    body: "1. 이곳에서 에너지, 감정과 함께 기록을 남겨봐.",
    image: require("../../assets/assets_v4/guide/guide_capture.png")
  },
  {
    tab: "calendar",
    body: "2. 남긴 기록은 여기서 캘린더, 필터를 통해 다시 볼 수 있어.",
    image: require("../../assets/assets_v4/guide/guide_collection.png")
  },
  {
    tab: "universe",
    body: "3. 기록의 카테고리와 감정에 따라 나만의 행성이 완성되는 것을 확인해봐.",
    image: require("../../assets/assets_v4/guide/guide_planet.png")
  },
  {
    tab: "collection",
    body: "4. 내 기록을 조금 더 분석적으로 보고 싶다면, 여기에서 다양한 레포트를 확인할 수 있어.",
    image: require("../../assets/assets_v4/guide/guide_analysis.png")
  },
  {
    tab: "settings",
    body: "5. 길고 정리된 기록보다는 순간의 진짜 생각과 감정을 남길 수 있도록, 알람을 설정해봐.",
    image: require("../../assets/assets_v4/guide/guide_notification.png")
  }
];

type Props = {
  stepIndex: number;
  onNext: () => void;
  onClose: () => void;
};

export function GuideCoachmark({ stepIndex, onNext, onClose }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const step = interactiveGuideSteps[stepIndex];
  if (!step) return null;
  const finalStep = stepIndex === interactiveGuideSteps.length - 1;
  const tabHeight = 70 + Math.max(insets.bottom, 10);
  const availableHeight = Math.max(1, screenHeight - insets.top - tabHeight - 16);
  const scale = Math.min((screenWidth - 16) / screenWidth, availableHeight / screenHeight);
  const cardSize = {
    width: Math.round(screenWidth * scale),
    height: Math.round(screenHeight * scale)
  };

  return (
    <View style={[styles.backdrop, { top: insets.top, bottom: tabHeight }]}>
      <View style={[styles.card, cardSize]}>
        <View style={styles.header}>
          <Text style={styles.progress}>GUIDE {stepIndex + 1} / {interactiveGuideSteps.length}</Text>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="가이드 닫기">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        <Image source={step.image} style={styles.screenshot} resizeMode="contain" />
        <Text style={styles.body}>{step.body}</Text>
        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextButtonText}>{finalStep ? "나만의 행성 만들러 가기" : "다음"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    right: 0,
    left: 0,
    zIndex: 120,
    elevation: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 7, 24, 0.78)"
  },
  card: {
    overflow: "hidden",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.42)",
    borderRadius: 8,
    backgroundColor: "#0b1b4d",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }
  },
  header: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  progress: {
    color: "#9fcfff",
    fontSize: 11,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30
  },
  closeText: {
    color: "#d8ebff",
    fontSize: 23,
    lineHeight: 25,
    fontWeight: "700"
  },
  screenshot: {
    width: "100%",
    flex: 1,
    minHeight: 0,
    marginTop: 5,
    borderRadius: 6,
    backgroundColor: "#070d2a"
  },
  body: {
    minHeight: 52,
    marginTop: 13,
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "800"
  },
  nextButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: "#c9e6ff"
  },
  nextButtonText: {
    color: "#0b1b4d",
    fontSize: 14,
    fontWeight: "900"
  }
});
