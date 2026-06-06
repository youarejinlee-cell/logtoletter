import { Pressable, StyleSheet, Text, View } from "react-native";
import { User } from "@supabase/supabase-js";
import { getGoogleRedirectUri, getNativeRedirectUri, getStandaloneRedirectUri, isSupabaseConfigured } from "../lib/supabase";
import { useAppTheme } from "../lib/theme";

type Props = {
  user: User | null;
  loading?: boolean;
  error?: string | null;
  onGoogleLogin: () => void;
  onSignOut: () => void;
};

export function AuthCard({ user, loading, error, onGoogleLogin, onSignOut }: Props) {
  const theme = useAppTheme();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Log to Letter";
  const expoGoRedirectUri = getNativeRedirectUri();
  const standaloneRedirectUri = getStandaloneRedirectUri();
  const googleRedirectUri = getGoogleRedirectUri();

  return (
    <View style={[styles.card, { borderBottomColor: theme.border, backgroundColor: theme.page }]}>
      <Text style={styles.label}>계정</Text>
      {user ? (
        <>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.text}>{displayName}</Text>
          <Text style={[styles.sub, { color: theme.tint }]}>{user.email || "Google 계정"}</Text>
          <Pressable style={styles.textButton} onPress={onSignOut}>
            <Text style={[styles.textButtonLabel, { color: theme.tint }]}>로그아웃</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>계정 연결</Text>
          <Text style={styles.text}>
            {isSupabaseConfigured ? "Google 계정으로 연결할 수 있어. Expo Go가 아니라 개발 빌드에서 테스트할게." : "Supabase 설정을 넣으면 Google 로그인을 쓸 수 있어."}
          </Text>
          <Text style={styles.redirect}>Google 로그인 Redirect URI: {googleRedirectUri}</Text>
          <Text style={styles.redirect}>Expo Go 참고 URI: {expoGoRedirectUri}</Text>
          <Text style={styles.redirect}>출시 앱 URI: {standaloneRedirectUri}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={!isSupabaseConfigured || loading} style={[styles.button, { backgroundColor: theme.tint }, (!isSupabaseConfigured || loading) && styles.disabled]} onPress={onGoogleLogin}>
            <Text style={styles.buttonLabel}>{loading ? "연결 중" : "Google로 계속하기"}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 7,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe8da",
    backgroundColor: "#fbfdf8"
  },
  label: {
    color: "#657064",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#18241b",
    fontSize: 15,
    fontWeight: "900"
  },
  text: {
    color: "#657064",
    fontSize: 13,
    lineHeight: 18
  },
  sub: {
    color: "#2f8f54",
    fontSize: 12,
    fontWeight: "800"
  },
  redirect: {
    color: "#657064",
    fontSize: 11,
    lineHeight: 16
  },
  error: {
    color: "#d92d20",
    fontSize: 12,
    fontWeight: "800"
  },
  button: {
    alignItems: "center",
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#18241b"
  },
  disabled: {
    opacity: 0.45
  },
  buttonLabel: {
    color: "#fff",
    fontWeight: "900"
  },
  textButton: {
    alignSelf: "flex-start",
    paddingVertical: 6
  },
  textButtonLabel: {
    color: "#2f8f54",
    fontWeight: "900"
  }
});
