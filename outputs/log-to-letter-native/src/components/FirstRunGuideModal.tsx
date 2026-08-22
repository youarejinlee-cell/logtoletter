import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

const logo = require("../../assets/assets_v4/app-logo/logo_v2.png");
const saturn = require("../../assets/assets_v4/deco/deco_saturn.png");

type Props = {
  visible: boolean;
  onStart: () => void;
  onClose: () => void;
};

export function FirstRunGuideModal({ visible, onStart, onClose }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.orbit} />
          <Image source={saturn} style={styles.saturn} resizeMode="contain" />
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="가이드 닫기">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.eyebrow}>LOG PLANET GUIDE</Text>
          <Text style={styles.title}>기록이 행성이 되는 방법</Text>
          <Text style={styles.description}>
            다섯 개의 탭을 함께 둘러보며{`\n`}나만의 기록 행성을 시작해봐.
          </Text>
          <Pressable style={styles.startButton} onPress={onStart}>
            <Text style={styles.startButtonText}>가이드 시작하기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(3, 7, 24, 0.78)"
  },
  card: {
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.38)",
    borderRadius: 8,
    backgroundColor: "#0b1b4d"
  },
  orbit: {
    position: "absolute",
    top: -78,
    right: -50,
    width: 190,
    height: 190,
    borderWidth: 1,
    borderColor: "rgba(159, 207, 255, 0.18)",
    borderRadius: 95
  },
  saturn: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 48,
    height: 48,
    opacity: 0.82
  },
  closeButton: {
    position: "absolute",
    top: 8,
    left: 8,
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38
  },
  closeText: {
    color: "rgba(216, 235, 255, 0.78)",
    fontSize: 25,
    lineHeight: 27,
    fontWeight: "700"
  },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 8
  },
  eyebrow: {
    marginTop: 18,
    color: "#9fcfff",
    fontSize: 11,
    fontWeight: "900"
  },
  title: {
    marginTop: 7,
    color: "#fff",
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center"
  },
  description: {
    marginTop: 10,
    color: "rgba(216, 235, 255, 0.78)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center"
  },
  startButton: {
    width: "100%",
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: "#c9e6ff"
  },
  startButtonText: {
    color: "#0b1b4d",
    fontSize: 15,
    fontWeight: "900"
  }
});
