import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { isSupabaseConfigured } from "../lib/supabase";

type Props = {
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

type Provider = "kakao" | "google";

const providerMeta: Record<Provider, { label: string; symbol: string }> = {
  kakao: { label: "카카오로 계속하기", symbol: "K" },
  google: { label: "Google로 계속하기", symbol: "G" }
};

function ProviderLoginButton({ provider, loading = false, onPress, style }: Props & { provider: Provider }) {
  const disabled = !isSupabaseConfigured || loading;
  const meta = providerMeta[provider];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meta.label}
      disabled={disabled}
      style={[
        styles.button,
        provider === "kakao" ? styles.kakaoButton : styles.googleButton,
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
    >
      <Text style={styles.symbol}>{meta.symbol}</Text>
      <Text style={styles.label}>{loading ? "연결 중" : meta.label}</Text>
    </Pressable>
  );
}

export function KakaoLoginButton(props: Props) {
  return <ProviderLoginButton {...props} provider="kakao" />;
}

export function GoogleLoginButton(props: Props) {
  return <ProviderLoginButton {...props} provider="google" />;
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8
  },
  kakaoButton: {
    borderColor: "#FEE500",
    backgroundColor: "#FEE500"
  },
  googleButton: {
    borderColor: "#DADCE0",
    backgroundColor: "#FFFFFF"
  },
  disabled: {
    opacity: 0.45
  },
  symbol: {
    position: "absolute",
    left: 18,
    color: "#191919",
    width: 22,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700"
  },
  label: {
    color: "#191919",
    fontSize: 16,
    fontWeight: "600"
  }
});
