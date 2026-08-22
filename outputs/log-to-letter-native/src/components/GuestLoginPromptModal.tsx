import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

const appLogo = require("../../assets/assets_v4/app-logo/logo_v2.png");
const saturn = require("../../assets/assets_v4/deco/deco_saturn.png");

type Props = {
  visible: boolean;
  loading?: boolean;
  onLogin: () => void;
  onDismiss: () => void;
};

export function GuestLoginPromptModal({ visible, loading = false, onLogin, onDismiss }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <Pressable style={styles.closeButton} onPress={onDismiss} accessibilityLabel="로그인 안내 닫기">
            <Text style={styles.closeText}>×</Text>
          </Pressable>

          <View style={styles.visualStage} pointerEvents="none">
            <View style={styles.orbit} />
            <Text style={[styles.star, styles.starLeft]}>✦</Text>
            <Text style={[styles.star, styles.starRight]}>✦</Text>
            <Image source={appLogo} style={styles.logo} />
            <Image source={saturn} style={styles.saturn} resizeMode="contain" />
          </View>

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>WELCOME TO LOG PLANET</Text>
            <Text style={styles.title}>나만의 기록 행성을 만들어봐</Text>
            <Text style={styles.description}>
              로그인하면 기록을 안전하게 보관하고, 쌓인 순간을 나만의 행성으로 불러올 수 있어.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={onLogin}
            >
              <Text style={styles.primaryText}>{loading ? "로그인 중" : "로그인하고 행성 만들기"}</Text>
              {!loading ? <Text style={styles.primaryArrow}>›</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={onDismiss}>
              <Text style={styles.secondaryText}>지금은 둘러볼게</Text>
            </Pressable>
          </View>
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
  saturn: {
    position: "absolute",
    right: 30,
    bottom: 14,
    width: 48,
    height: 48,
    transform: [{ rotate: "-8deg" }]
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
    right: 45,
    top: 24,
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
    maxWidth: 284,
    color: "rgba(226, 235, 255, 0.76)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center"
  },
  actions: {
    gap: 8
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 42,
    borderRadius: 8,
    backgroundColor: "#c9e6ff"
  },
  primaryText: {
    color: "#0b1b4d",
    fontSize: 15,
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
    paddingHorizontal: 16,
    borderRadius: 8
  },
  secondaryText: {
    color: "rgba(216, 235, 255, 0.78)",
    fontSize: 14,
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.5
  }
});
