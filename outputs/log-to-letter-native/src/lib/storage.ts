import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "../types/domain";

export const STORAGE_KEY = "log-to-letter-native-v1";

export const defaultState: AppState = {
  entries: [],
  letters: [],
  theme: "green",
  energyColorMode: "soft",
  calendarEnergyMode: "last",
  settings: {
    enabled: false,
    startTime: "09:00",
    dndStart: "22:00",
    dndEnd: "08:00",
    intervalMinutes: 120
  }
};

export async function loadAppState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;

  try {
    const saved = JSON.parse(raw) as Partial<AppState>;
    return {
      ...defaultState,
      ...saved,
      settings: {
        ...defaultState.settings,
        ...(saved.settings || {})
      }
    };
  } catch {
    return defaultState;
  }
}

export async function saveAppState(state: AppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
