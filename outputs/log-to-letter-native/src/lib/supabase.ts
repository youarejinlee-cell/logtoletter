import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { appScheme, isProductionVariant } from "./appVariant";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig";

WebBrowser.maybeCompleteAuthSession();

const ANDROID_REDIRECT_GRACE_MS = 8000;
const ANDROID_APP_LINK_REDIRECT_URI = "https://youarejinlee-cell.github.io/logtoletter/auth/callback";
const oauthCallbackSessions = new Map<string, Promise<Session | null>>();

export type AuthFlowErrorCode =
  | "CALLBACK_TIMEOUT"
  | "CALLBACK_MISSING"
  | "CALLBACK_INVALID"
  | "CALLBACK_DUPLICATE"
  | "PROVIDER_ERROR"
  | "CODE_EXCHANGE_FAILED"
  | "SESSION_CREATE_FAILED"
  | "SESSION_MISSING";

export class AuthFlowError extends Error {
  readonly code: AuthFlowErrorCode;

  constructor(code: AuthFlowErrorCode, message: string) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

export function getAuthFlowErrorCode(error: unknown): AuthFlowErrorCode | null {
  return error instanceof AuthFlowError ? error.code : null;
}

function authDiagnostic(
  level: "log" | "warn" | "error",
  event: string,
  details: Record<string, string | boolean | number | null> = {}
) {
  console[level](`[AUTH] ${event}`, details);
}

const authStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key)
};

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL || "https://example.supabase.co", SUPABASE_ANON_KEY || "anon-key", {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

export function getNativeRedirectUri() {
  return AuthSession.makeRedirectUri({
    path: "auth/callback"
  });
}

export function getStandaloneRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: appScheme,
    path: "auth/callback"
  });
}

export function getOAuthRedirectUri() {
  if (Platform.OS === "android" && isProductionVariant) return ANDROID_APP_LINK_REDIRECT_URI;
  return `${appScheme}://auth/callback`;
}

function getAuthParams(url: string) {
  const parsedUrl = new URL(url);
  const queryParams = parsedUrl.searchParams;
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
  const getParam = (key: string) => queryParams.get(key) ?? hashParams.get(key);

  return {
    accessToken: getParam("access_token"),
    refreshToken: getParam("refresh_token"),
    code: getParam("code"),
    error: getParam("error"),
    errorCode: getParam("error_code"),
    errorDescription: getParam("error_description")
  };
}

function createOAuthRedirectListener(redirectTo: string) {
  let resolveRedirect: (url: string) => void = () => undefined;
  const promise = new Promise<string>((resolve) => {
    resolveRedirect = resolve;
  });
  const subscription = Linking.addEventListener("url", ({ url }) => {
    if (url.startsWith(redirectTo)) {
      authDiagnostic("log", "deep_link_received", { source: "event" });
      resolveRedirect(url);
    }
  });

  return {
    promise,
    remove: () => subscription.remove()
  };
}

function waitForRedirect(urlPromise: Promise<string>, timeoutMs: number): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    urlPromise.then((url) => {
      clearTimeout(timer);
      resolve(url);
    });
  });
}

async function getOAuthBrowserOptions() {
  if (Platform.OS !== "android") return undefined;

  authDiagnostic("log", "android_auth_browser_selected", {
    browser: "default",
    forcedChrome: false
  });

  return {
    // Keeping the Custom Tab in the app task avoids an early app-resume race on Android.
    createTask: false
  };
}

async function createSessionFromOAuthUrlOnce(url: string, providerLabel: string): Promise<Session | null> {
  const { accessToken, refreshToken, code, error, errorCode, errorDescription } = getAuthParams(url);
  authDiagnostic("log", "callback_parsed", {
    provider: providerLabel,
    hasCode: Boolean(code),
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    hasProviderError: Boolean(error || errorCode || errorDescription)
  });

  if (error || errorCode) {
    authDiagnostic("warn", "provider_error", { code: "PROVIDER_ERROR", provider: providerLabel });
    if (error === "access_denied" || errorCode === "access_denied") {
      throw new AuthFlowError("PROVIDER_ERROR", `${providerLabel} 로그인이 취소되었어.`);
    }
    throw new AuthFlowError("PROVIDER_ERROR", `${providerLabel} 로그인 과정에서 문제가 생겼어. 다시 시도해줘.`);
  }

  if (code) {
    authDiagnostic("log", "code_exchange_started", { provider: providerLabel });
    const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
    if (codeError) {
      authDiagnostic("error", "code_exchange_failed", { code: "CODE_EXCHANGE_FAILED", provider: providerLabel });
      throw new AuthFlowError("CODE_EXCHANGE_FAILED", `${providerLabel} 로그인 정보를 확인하지 못했어. 다시 시도해줘.`);
    }
    if (!data.session) {
      authDiagnostic("error", "session_missing", { code: "SESSION_MISSING", provider: providerLabel, flow: "code" });
      throw new AuthFlowError("SESSION_MISSING", `${providerLabel} 로그인 세션을 만들지 못했어. 다시 시도해줘.`);
    }
    authDiagnostic("log", "code_exchange_completed", { provider: providerLabel, hasSession: true });
    return data.session;
  }

  if (!accessToken || !refreshToken) {
    authDiagnostic("error", "callback_invalid", { code: "CALLBACK_INVALID", provider: providerLabel });
    throw new AuthFlowError("CALLBACK_INVALID", `${providerLabel} 로그인 정보를 앱으로 전달받지 못했어. 다시 시도해줘.`);
  }

  const { data, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  if (sessionError) {
    authDiagnostic("error", "session_create_failed", { code: "SESSION_CREATE_FAILED", provider: providerLabel });
    throw new AuthFlowError("SESSION_CREATE_FAILED", `${providerLabel} 로그인 세션을 저장하지 못했어. 다시 시도해줘.`);
  }
  if (!data.session) {
    authDiagnostic("error", "session_missing", { code: "SESSION_MISSING", provider: providerLabel, flow: "token" });
    throw new AuthFlowError("SESSION_MISSING", `${providerLabel} 로그인 세션을 만들지 못했어. 다시 시도해줘.`);
  }
  authDiagnostic("log", "session_set_completed", { provider: providerLabel, hasSession: true });
  return data.session;
}

async function createSessionFromOAuthUrl(url: string, providerLabel: string): Promise<Session | null> {
  const callbackId = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, url);
  const existingPromise = oauthCallbackSessions.get(callbackId);
  if (existingPromise) {
    authDiagnostic("warn", "duplicate_callback", { code: "CALLBACK_DUPLICATE", provider: providerLabel });
    return existingPromise;
  }

  const sessionPromise = createSessionFromOAuthUrlOnce(url, providerLabel);
  oauthCallbackSessions.set(callbackId, sessionPromise);
  try {
    return await sessionPromise;
  } catch (error) {
    oauthCallbackSessions.delete(callbackId);
    throw error;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function completeOAuthSessionFromInitialUrl(): Promise<Session | null> {
  const initialUrl = await Linking.getInitialURL();
  const isOAuthCallback = Boolean(initialUrl?.startsWith(getOAuthRedirectUri()));
  authDiagnostic("log", "initial_url_checked", { hasInitialUrl: Boolean(initialUrl), isOAuthCallback });
  if (!initialUrl || !isOAuthCallback) return null;

  authDiagnostic("log", "cold_start_callback_received", { source: "initial_url" });
  return completeOAuthSessionFromUrl(initialUrl);
}

export async function completeOAuthSessionFromUrl(url: string): Promise<Session | null> {
  if (!url.startsWith(getOAuthRedirectUri())) return null;
  authDiagnostic("log", "global_callback_received", { source: "app_listener" });
  return createSessionFromOAuthUrl(url, "소셜");
}

async function signInWithOAuthProvider(provider: "google" | "kakao", providerLabel: string): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase 설정이 필요해.");
  }

  const redirectTo = getOAuthRedirectUri();
  authDiagnostic("log", "oauth_started", { provider, platform: Platform.OS });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) throw error;
  if (!data.url) throw new Error(`${providerLabel} 로그인 URL을 만들지 못했어.`);

  const redirectListener = createOAuthRedirectListener(redirectTo);
  try {
    const browserOptions = await getOAuthBrowserOptions();
    const browserResultPromise = WebBrowser.openAuthSessionAsync(data.url, redirectTo, browserOptions).then((result) => ({
      source: "browser" as const,
      result
    }));
    const redirectResultPromise = redirectListener.promise.then((url) => ({
      source: "link" as const,
      url
    }));
    const outcome = await Promise.race([browserResultPromise, redirectResultPromise]);

    let callbackUrl: string | null = null;
    let browserResultType: string | null = null;
    if (outcome.source === "link") {
      callbackUrl = outcome.url;
    } else {
      browserResultType = outcome.result.type;
      authDiagnostic("log", "browser_result", { provider, resultType: browserResultType });
      if (outcome.result.type === "success") {
        callbackUrl = outcome.result.url;
      }
    }

    authDiagnostic("log", "oauth_race_completed", {
      provider,
      winner: outcome.source,
      hasCallback: Boolean(callbackUrl)
    });

    // Android can resume the app before the deep-link event reaches JavaScript.
    if (!callbackUrl && Platform.OS === "android") {
      authDiagnostic("log", "delayed_callback_wait_started", {
        provider,
        timeoutMs: ANDROID_REDIRECT_GRACE_MS,
        browserResultType
      });
      callbackUrl = await waitForRedirect(redirectListener.promise, ANDROID_REDIRECT_GRACE_MS);
      authDiagnostic(callbackUrl ? "log" : "warn", "delayed_callback_wait_completed", {
        provider,
        hasCallback: Boolean(callbackUrl),
        code: callbackUrl ? null : "CALLBACK_TIMEOUT"
      });
    }

    if (callbackUrl) {
      console.log("[AUTH] callback received");

      try {
        const session = await createSessionFromOAuthUrl(
          callbackUrl,
          providerLabel
        );

        console.log("[AUTH] session created", !!session);

        return session;
      } catch (e) {
        console.error("[AUTH] createSessionFromOAuthUrl failed", e);
        throw e;
      }
    }

    // A callback may already have persisted the session even if the browser result was lost.
    const existingSession = await getCurrentSession();
    if (existingSession) {
      authDiagnostic("log", "existing_session_recovered", { provider, hasSession: true });
      return existingSession;
    }

    const missingCode: AuthFlowErrorCode = Platform.OS === "android" ? "CALLBACK_TIMEOUT" : "CALLBACK_MISSING";
    authDiagnostic("warn", "callback_missing", { code: missingCode, provider, browserResultType });
    throw new AuthFlowError(missingCode, `${providerLabel} 로그인은 완료됐지만 앱으로 돌아오는 연결을 확인하지 못했어. 다시 시도해줘.`);
  } finally {
    redirectListener.remove();
  }
}

export function signInWithGoogle(): Promise<Session | null> {
  return signInWithOAuthProvider("google", "Google");
}

export function signInWithKakao(): Promise<Session | null> {
  return signInWithOAuthProvider("kakao", "카카오");
}

export async function signInWithApple(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase 설정이 필요해.");
  }
  if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync())) {
    throw new Error("이 기기에서는 Apple 로그인을 사용할 수 없어.");
  }

  try {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ],
      nonce: hashedNonce
    });

    if (!credential.identityToken) {
      throw new Error("Apple 로그인 토큰을 받지 못했어.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce
    });
    if (error) throw error;

    const givenName = credential.fullName?.givenName || null;
    const familyName = credential.fullName?.familyName || null;
    const fullName = [givenName, familyName].filter(Boolean).join(" ");
    if (fullName) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          given_name: givenName,
          family_name: familyName
        }
      });
      if (updateError) throw updateError;
      return getCurrentSession();
    }

    return data.session;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ERR_REQUEST_CANCELED") {
      return null;
    }
    throw error;
  }
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

export async function deleteAccount() {
  if (!isSupabaseConfigured) throw new Error("Supabase 설정이 필요해.");
  const { error } = await supabase.functions.invoke("delete-account");
  if (error) throw error;
}
