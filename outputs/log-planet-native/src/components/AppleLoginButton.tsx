import { useEffect, useState } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";

type Props = {
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AppleLoginButton({ loading = false, onPress, style }: Props) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  return (
    <View pointerEvents={loading ? "none" : "auto"} style={[styles.wrap, loading && styles.disabled, style]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={8}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 48
  },
  button: {
    width: "100%",
    height: 48
  },
  disabled: {
    opacity: 0.45
  }
});
