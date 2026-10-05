import { emptyStarWallet, normalizeStarWallet, mergeStarWallet, rewardGuestMissions } from "./starRewards";
import { earliestTrialStart, normalizeTrialStart } from "./accessPolicy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, ColorTheme, LetterPaperStyle, Mood } from "../types/domain";
import { normalizeEntryCategory } from "./entryCategories";
import { normalizeEnergyPercent } from "./energyColors";
import { defaultRepresentativeEmotionTags, normalizeRepresentativeEmotionTags } from "./emotionTags";

export const STORAGE_KEY = "log-to-letter-native-v1";
const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const GUEST_STORAGE_NOTICE_KEY = `${STORAGE_KEY}:guest-storage-notice-shown`;
const FIRST_RUN_GUIDE_KEY = `${STORAGE_KEY}:first-run-guide-complete`;
const FIRST_ENTRY_NOTIFICATION_PROMPT_KEY = `${STORAGE_KEY}:first-entry-notification-prompt-shown`;
const PREMIUM_TRANSITION_NOTICE_KEY = `${STORAGE_KEY}:premium-transition-notice-2026-09`;

export function appStateStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:user:${encodeURIComponent(userId)}` : GUEST_STORAGE_KEY;
}

export const defaultState: AppState = {
  stars: emptyStarWallet(),
  entries: [],
  letters: [],
  monthlyNotes: {},
  theme: "green",
  energyColorMode: "soft",
  calendarEnergyMode: "last",
  targetMoods: [],
  representativeEmotionTags: defaultRepresentativeEmotionTags,
  letterPaperStyle: "plain",
  settings: {
    enabled: false,
    scheduleMode: "interval",
    startTime: "09:00",
    endTime: "22:00",
    dndStart: "22:00",
    dndEnd: "08:00",
    intervalMinutes: 120,
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    fixedTimes: ["10:00"],
    randomStartTime: "09:00",
    randomEndTime: "22:00",
    randomDailyCount: 4
  }
};

const letterPaperStyles: LetterPaperStyle[] = ["plain", "themeBorder", "clover", "cloudTitle"];
const validColorThemes: ColorTheme[] = ["red", "yellow", "green", "blue", "white", "black"];
const validMoods: Mood[] = [
  "calm", "joy", "moved", "recovered", "happy", "delight", "excited", "fun", "hopeful", "grateful", "proud", "peaceful", "lucky", "selfEsteem",
  "anxious", "soSo", "indifferent", "curious", "accepting", "reflective", "envious", "instructive", "difficult", "worried", "tired", "sad",
  "depressed", "angry", "irritated", "jealous", "prideHurt", "sensitive", "regret", "blank", "complex"
];
export function normalizeLetterPaperStyle(value: unknown): LetterPaperStyle {
  return letterPaperStyles.includes(value as LetterPaperStyle) ? (value as LetterPaperStyle) : "plain";
}

export function normalizeColorTheme(value: unknown): ColorTheme {
  return validColorThemes.includes(value as ColorTheme) ? (value as ColorTheme) : "green";
}

export function normalizeMonthlyNotes(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, note]) => /^\d{4}-\d{2}$/.test(key) && typeof note === "string")
      .map(([key, note]) => [key, (note as string).slice(0, 2000)])
  );
}

function parseAppState(raw: string | null): AppState {
  if (!raw) return defaultState;

  try {
    const saved = JSON.parse(raw) as Partial<AppState>;
    const state = {
      ...defaultState,
      ...saved,
      trialStartedAt: normalizeTrialStart(saved.trialStartedAt),
      stars: normalizeStarWallet(saved.stars),
      settings: {
        ...defaultState.settings,
        ...(saved.settings || {}),
        endTime: saved.settings?.endTime || saved.settings?.dndStart || defaultState.settings.endTime
      },
      entries: (saved.entries || []).map((entry) => ({
        ...entry,
        energy: normalizeEnergyPercent(entry.energy),
        category: normalizeEntryCategory(entry.category)
      })),
      monthlyNotes: normalizeMonthlyNotes(saved.monthlyNotes),
      theme: normalizeColorTheme(saved.theme),
      targetMoods: (saved.targetMoods || []).filter((mood): mood is Mood => validMoods.includes(mood as Mood)).slice(0, 3),
      representativeEmotionTags: normalizeRepresentativeEmotionTags(saved.representativeEmotionTags),
      letterPaperStyle: normalizeLetterPaperStyle(saved.letterPaperStyle)
    };
    return state;
  } catch {
    return defaultState;
  }
}

function entryIdsFromRaw(raw: string | null) {
  if (!raw) return [];
  try {
    const saved = JSON.parse(raw) as Partial<AppState>;
    return (saved.entries || []).map((entry) => entry.id).sort();
  } catch {
    return [];
  }
}

async function removeDuplicatedGuestState(userRaw: string) {
  const guestRaw = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
  const userEntryIds = entryIdsFromRaw(userRaw);
  const guestEntryIds = entryIdsFromRaw(guestRaw);
  if (!userEntryIds.length || userEntryIds.length !== guestEntryIds.length) return;
  if (userEntryIds.every((entryId, index) => entryId === guestEntryIds[index])) {
    await AsyncStorage.removeItem(GUEST_STORAGE_KEY);
  }
}

async function loadStoredAppState(userId?: string | null, options?: { migrateLegacy?: boolean }): Promise<AppState> {
  const scopedKey = appStateStorageKey(userId);
  const scopedRaw = await AsyncStorage.getItem(scopedKey);
  if (scopedRaw) {
    if (userId) await removeDuplicatedGuestState(scopedRaw);
    return parseAppState(scopedRaw);
  }

  if (options?.migrateLegacy) {
    const legacyRaw = await AsyncStorage.getItem(STORAGE_KEY);
    if (legacyRaw) {
      await AsyncStorage.setItem(scopedKey, legacyRaw);
      await AsyncStorage.removeItem(STORAGE_KEY);
      if (userId) await removeDuplicatedGuestState(legacyRaw);
      return parseAppState(legacyRaw);
    }
  }

  return defaultState;
}

// Kept separately so deleting records or importing an empty backup cannot restart a trial.
export async function loadAppState(userId?: string | null, options?: { migrateLegacy?: boolean }): Promise<AppState> {
  const state = await loadStoredAppState(userId, options);
  const remembered = await AsyncStorage.getItem(`${appStateStorageKey(userId)}:trial-start`);
  const trialStartedAt = earliestTrialStart(remembered, state.trialStartedAt)
    || (state.entries.length ? new Date().toISOString() : undefined);
  if (trialStartedAt) await AsyncStorage.setItem(`${appStateStorageKey(userId)}:trial-start`, trialStartedAt);
  const starRaw = await AsyncStorage.getItem(`${appStateStorageKey(userId)}:stars`);
  let rememberedStars = emptyStarWallet();
  try { rememberedStars = normalizeStarWallet(starRaw ? JSON.parse(starRaw) : null); } catch { /* older missing ledger */ }
  let stars = mergeStarWallet(state.stars, rememberedStars);
  if (!userId) {
    stars = rewardGuestMissions(stars, state.entries, new Date());
    await AsyncStorage.setItem(`${appStateStorageKey(userId)}:stars`, JSON.stringify(stars));
  }
  return { ...state, trialStartedAt, stars };
}

let saveQueue: Promise<void> = Promise.resolve();
export function saveAppState(state: AppState, userId?: string | null) {
  const task = saveQueue.catch(() => {}).then(() => persistAppState(state, userId));
  saveQueue = task;
  return task;
}
async function persistAppState(state: AppState, userId?: string | null) {
  const starKey = `${appStateStorageKey(userId)}:stars`;
  let previousStars = emptyStarWallet();
  try { previousStars = normalizeStarWallet(JSON.parse(await AsyncStorage.getItem(starKey) || "null")); } catch { /* empty */ }
  const stars = userId ? state.stars : mergeStarWallet(state.stars, previousStars);
  await AsyncStorage.setItem(starKey, JSON.stringify(stars));
  const trialKey = `${appStateStorageKey(userId)}:trial-start`;
  const trialStartedAt = earliestTrialStart(await AsyncStorage.getItem(trialKey), state.trialStartedAt);
  if (trialStartedAt) await AsyncStorage.setItem(trialKey, trialStartedAt);
  await AsyncStorage.setItem(appStateStorageKey(userId), JSON.stringify({ ...state, trialStartedAt, stars }));
}

export async function removeAppState(userId?: string | null, options?: { forgetTrial?: boolean }) {
  await AsyncStorage.removeItem(appStateStorageKey(userId));
  if (options?.forgetTrial) await AsyncStorage.removeItem(`${appStateStorageKey(userId)}:stars`);
  if (options?.forgetTrial) await AsyncStorage.removeItem(`${appStateStorageKey(userId)}:trial-start`);
}

export async function claimGuestStorageNotice() {
  const alreadyShown = await AsyncStorage.getItem(GUEST_STORAGE_NOTICE_KEY);
  if (alreadyShown === "true") return false;
  await AsyncStorage.setItem(GUEST_STORAGE_NOTICE_KEY, "true");
  return true;
}

export async function hasCompletedFirstRunGuide() {
  return await AsyncStorage.getItem(FIRST_RUN_GUIDE_KEY) === "true";
}

export async function completeFirstRunGuide() {
  await AsyncStorage.setItem(FIRST_RUN_GUIDE_KEY, "true");
}

export async function claimFirstEntryNotificationPrompt() {
  const alreadyShown = await AsyncStorage.getItem(FIRST_ENTRY_NOTIFICATION_PROMPT_KEY);
  if (alreadyShown === "true") return false;
  await AsyncStorage.setItem(FIRST_ENTRY_NOTIFICATION_PROMPT_KEY, "true");
  return true;
}

export async function claimPremiumTransitionNotice(userId: string) {
  const key = `${PREMIUM_TRANSITION_NOTICE_KEY}:${encodeURIComponent(userId)}`;
  const alreadyShown = await AsyncStorage.getItem(key);
  if (alreadyShown === "true") return false;
  await AsyncStorage.setItem(key, "true");
  return true;
}
