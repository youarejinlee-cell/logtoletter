import { User } from "@supabase/supabase-js";

export const ANONYMOUS_TRAVELER_NAME = "이름 없는 여행자";

function cleanMetadataValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function isKakaoUser(user: User): boolean {
  const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
  return user.app_metadata?.provider === "kakao"
    || providers.includes("kakao")
    || user.identities?.some((identity) => identity.provider === "kakao") === true;
}

export function getUserDisplayName(user: User): string {
  const metadata = user.user_metadata || {};
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.nickname,
    metadata.preferred_username,
    metadata.user_name
  ]
    .map(cleanMetadataValue)
    .filter((value): value is string => Boolean(value));

  const kakaoUser = isKakaoUser(user);
  const displayName = candidates.find((candidate) => !(kakaoUser && candidate.toLowerCase() === "log planet"));
  if (displayName) return displayName;
  if (kakaoUser) return ANONYMOUS_TRAVELER_NAME;

  return cleanMetadataValue(user.email?.split("@")[0]) || "Log Planet";
}

export function getUserAvatarUrl(user: User): string | null {
  return cleanMetadataValue(user.user_metadata?.avatar_url)
    || cleanMetadataValue(user.user_metadata?.picture);
}
