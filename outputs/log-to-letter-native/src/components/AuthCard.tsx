import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { User } from "@supabase/supabase-js";
import { AppleLoginButton } from "./AppleLoginButton";
import { GoogleLoginButton, KakaoLoginButton } from "./KakaoLoginButton";
import { getUserAvatarUrl, getUserDisplayName } from "../lib/profile";
import { isSupabaseConfigured } from "../lib/supabase";
import { useAppTheme } from "../lib/theme";

const defaultProfileImage = require("../../assets/assets_v4/app-logo/logo_v2.png");

type Props = {
  user: User | null;
  loading?: boolean;
  error?: string | null;
  onAppleLogin: () => void;
  onGoogleLogin: () => void;
  onKakaoLogin: () => void;
};

export function AuthCard({ user, loading, error, onAppleLogin, onGoogleLogin, onKakaoLogin }: Props) {
  const theme = useAppTheme();
  const loginProviders = Platform.OS === "ios" ? "Apple, 카카오 또는 Google" : "카카오 또는 Google";
  const displayName = user ? getUserDisplayName(user) : "Log Planet";
  const avatarUrl = user ? getUserAvatarUrl(user) : null;

  return (
    <View style={[styles.card, { borderBottomColor: theme.border, backgroundColor: theme.cardAlt }]}>
      {user ? (
        <View style={styles.profileRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Image source={defaultProfileImage} style={styles.avatar} />
          )}
          <View style={styles.profileText}>
            <Text style={[styles.title, { color: theme.text }]}>{displayName}</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.label, { color: theme.muted }]}>계정</Text>
          <Text style={[styles.title, { color: theme.text }]}>계정 연결</Text>
          <Text style={[styles.text, { color: theme.muted }]}>
            {isSupabaseConfigured ? `${loginProviders} 계정으로 연결할 수 있어.` : "Supabase 설정을 넣으면 계정 로그인을 쓸 수 있어."}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppleLoginButton loading={loading} onPress={onAppleLogin} />
          <KakaoLoginButton loading={loading} onPress={onKakaoLogin} />
          <GoogleLoginButton loading={loading} onPress={onGoogleLogin} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe8da",
    backgroundColor: "#fbfdf8"
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 999
  },
  profileText: {
    flex: 1,
    gap: 3
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
  error: {
    color: "#d92d20",
    fontSize: 12,
    fontWeight: "800"
  },
});
