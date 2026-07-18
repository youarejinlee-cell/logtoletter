import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, ColorTheme, LetterPaperStyle, Mood } from "../types/domain";
import { normalizeEntryCategory } from "./entryCategories";
import { normalizeEnergyPercent } from "./energyColors";

export const STORAGE_KEY = "log-to-letter-native-v1";
const GUEST_STORAGE_KEY = `${STORAGE_KEY}:guest`;
const GUEST_STORAGE_NOTICE_KEY = `${STORAGE_KEY}:guest-storage-notice-shown`;
const FIRST_RUN_GUIDE_KEY = `${STORAGE_KEY}:first-run-guide-complete`;

export function appStateStorageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:user:${encodeURIComponent(userId)}` : GUEST_STORAGE_KEY;
}

export const defaultState: AppState = {
  entries: [],
  letters: [],
  monthlyNotes: {},
  theme: "green",
  energyColorMode: "soft",
  calendarEnergyMode: "last",
  targetMoods: [],
  letterPaperStyle: "plain",
  settings: {
    enabled: false,
    scheduleMode: "interval",
    startTime: "09:00",
    dndStart: "22:00",
    dndEnd: "08:00",
    intervalMinutes: 120,
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    fixedTimes: ["10:00"]
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
      settings: {
        ...defaultState.settings,
        ...(saved.settings || {})
      },
      entries: (saved.entries || []).map((entry) => ({
        ...entry,
        energy: normalizeEnergyPercent(entry.energy),
        category: normalizeEntryCategory(entry.category)
      })),
      monthlyNotes: normalizeMonthlyNotes(saved.monthlyNotes),
      theme: normalizeColorTheme(saved.theme),
      targetMoods: (saved.targetMoods || []).filter((mood): mood is Mood => validMoods.includes(mood as Mood)).slice(0, 3),
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

export async function loadAppState(userId?: string | null, options?: { migrateLegacy?: boolean }): Promise<AppState> {
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

export async function saveAppState(state: AppState, userId?: string | null) {
  await AsyncStorage.setItem(appStateStorageKey(userId), JSON.stringify(state));
}

export async function removeAppState(userId?: string | null) {
  await AsyncStorage.removeItem(appStateStorageKey(userId));
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
