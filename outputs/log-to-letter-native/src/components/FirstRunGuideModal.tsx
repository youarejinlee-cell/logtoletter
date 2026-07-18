import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const guideSteps = [
  {
    number: "01",
    title: "지금의 기록 남기기",
    body: "떠오른 생각을 적고 감정, 에너지, 카테고리를 골라 기록해."
  },
  {
    number: "02",
    title: "한 달의 흐름 돌아보기",
    body: "모아보기와 분석 보기에서 기록의 개수와 감정, 에너지 흐름을 확인해."
  },
  {
    number: "03",
    title: "나만의 기록 행성 만들기",
    body: "로그인한 뒤 기록이 쌓이면 카테고리별 대륙과 장식이 한 달의 행성을 완성해."
  },
  {
    number: "04",
    title: "기록 안전하게 보관하기",
    body: "로그인 전 기록은 기기에만 저장돼. 로그인할 때 가져오기를 선택하면 계정에 연결할 수 있어."
  }
];

export function FirstRunGuideModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView edges={["left", "right", "bottom"]} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>LOG PLANET GUIDE</Text>
            <Text style={styles.title}>기록이 행성이 되는 방법</Text>
            <Text style={styles.description}>짧게 남긴 순간들이 모여 한 달의 행성을 만들어.</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="가이드 닫기">
            <Text style={styles.closeButtonText}>×</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {guideSteps.map((step) => (
            <View key={step.number} style={styles.step}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
          <View style={styles.footer}>
            <Pressable style={styles.startButton} onPress={onClose}>
              <Text style={styles.startButtonText}>시작하기</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#070d2a"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(191, 224, 255, 0.16)"
  },
  headerCopy: {
    flex: 1,
    gap: 6
  },
  eyebrow: {
    color: "#9fcfff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: "#fff",
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "900"
  },
  description: {
    color: "rgba(216, 235, 255, 0.7)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  closeButtonText: {
    color: "#eaf2ff",
    fontSize: 25,
    lineHeight: 27,
    fontWeight: "500"
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20
  },
  step: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.18)",
    borderRadius: 8,
    backgroundColor: "rgba(17, 31, 76, 0.88)"
  },
  stepNumber: {
    width: 30,
    color: "#9fcfff",
    fontSize: 13,
    fontWeight: "900"
  },
  stepCopy: {
    flex: 1,
    gap: 6
  },
  stepTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900"
  },
  stepBody: {
    color: "rgba(216, 235, 255, 0.72)",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  footer: {
    marginTop: 10
  },
  startButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#c9e6ff"
  },
  startButtonText: {
    color: "#0b1b4d",
    fontSize: 15,
    fontWeight: "900"
  }
});
