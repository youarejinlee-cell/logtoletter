import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

const appLogo = require("../../assets/assets_v4/app-logo/logo_v2.png");
const saturn = require("../../assets/assets_v4/deco/deco_saturn.png");

type Props = {
  visible: boolean;
  onOpenSettings: () => void;
  onDismiss: () => void;
};

export function FirstEntryNotificationPromptModal({ visible, onOpenSettings, onDismiss }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <Pressable style={styles.closeButton} onPress={onDismiss} accessibilityLabel="기록 알림 안내 닫기">
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <View style={styles.visualStage} pointerEvents="none">
            <View style={styles.orbit} />
            <Text style={[styles.star, styles.starLeft]}>✦</Text>
            <Text style={[styles.star, styles.starRight]}>✦</Text>
            <Image source={appLogo} style={styles.logo} />
            <View style={styles.bellBadge}>
              <Text style={styles.bell}>🔔</Text>
            </View>
            <Image source={saturn} style={styles.saturn} resizeMode="contain" />
          </View>

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>KEEP YOUR MOMENTS</Text>
            <Text style={styles.title}>기록할 순간을 놓치지 않게</Text>
            <Text style={styles.description}>날 것의 생각과 감정을 남길 수 있도록 기록 알림을 만들어봐.</Text>
          </View>

          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={onOpenSettings}>
            <Text style={styles.primaryText}>앱 알림으로 기록에 도움 받기</Text>
            <Text style={styles.primaryArrow}>›</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={onDismiss}>
            <Text style={styles.secondaryText}>나중에 할게</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(3, 7, 24, 0.82)"
  },
  modal: {
    width: "100%",
    maxWidth: 356,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.36)",
    borderRadius: 8,
    backgroundColor: "#0b1b4d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 18
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  closeText: {
    color: "#d8ebff",
    fontSize: 23,
    lineHeight: 25,
    fontWeight: "600"
  },
  visualStage: {
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  orbit: {
    position: "absolute",
    width: 188,
    height: 72,
    borderWidth: 1,
    borderColor: "rgba(159, 215, 255, 0.34)",
    borderRadius: 999,
    transform: [{ rotate: "-12deg" }]
  },
  logo: {
    width: 88,
    height: 88,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 8
  },
  bellBadge: {
    position: "absolute",
    right: 61,
    top: 12,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.52)",
    borderRadius: 17,
    backgroundColor: "#c9e6ff"
  },
  bell: {
    fontSize: 17,
    lineHeight: 21
  },
  saturn: {
    position: "absolute",
    left: 30,
    bottom: 12,
    width: 46,
    height: 46,
    transform: [{ rotate: "8deg" }]
  },
  star: {
    position: "absolute",
    color: "#f4dc82",
    fontSize: 18,
    fontWeight: "900"
  },
  starLeft: {
    left: 38,
    top: 21
  },
  starRight: {
    right: 42,
    bottom: 20,
    fontSize: 11
  },
  copy: {
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 20
  },
  eyebrow: {
    color: "#9fd7ff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  description: {
    maxWidth: 288,
    color: "rgba(226, 235, 255, 0.78)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center"
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 38,
    borderRadius: 8,
    backgroundColor: "#c9e6ff"
  },
  primaryText: {
    color: "#0b1b4d",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  primaryArrow: {
    position: "absolute",
    right: 18,
    color: "#0b1b4d",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "500"
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  secondaryText: {
    color: "rgba(216, 235, 255, 0.78)",
    fontSize: 14,
    fontWeight: "800"
  }
});
