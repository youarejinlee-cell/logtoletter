import { User } from "@supabase/supabase-js";
import { AppState, Entry, Letter, Mood, NotificationSettings } from "../types/domain";
import { createId, isUuid } from "./ids";
import { supabase } from "./supabase";

type EntryRow = {
  id: string;
  text: string;
  mood: string;
  energy: number;
  created_at: string;
};

type LetterRow = {
  id: string;
  title: string;
  body: string;
  period_start: string;
  period_end: string;
  delivered_at: string;
  summary_json?: { keyword?: string } | null;
  postscript?: string | null;
};

type NotificationSettingsRow = {
  enabled: boolean;
  start_time: string;
  interval_minutes: number;
  dnd_start: string;
  dnd_end: string;
};

type AppSettingsRow = {
  preferences?: {
    theme?: AppState["theme"];
    energyColorMode?: AppState["energyColorMode"];
    calendarEnergyMode?: AppState["calendarEnergyMode"];
  } | null;
};

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function splitPeriod(periodLabel: string, deliveredAt: string) {
  const match = periodLabel.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/);
  if (match) return { start: match[1], end: match[2] };

  const delivered = new Date(deliveredAt);
  const start = new Date(delivered);
  start.setDate(start.getDate() - 7);
  const end = new Date(delivered);
  end.setDate(end.getDate() - 1);
  return { start: dateKey(start), end: dateKey(end) };
}

function normalizeEntries(entries: Entry[]) {
  return entries.map((entry) => (isUuid(entry.id) ? entry : { ...entry, id: createId() }));
}

function entryToRow(userId: string, entry: Entry) {
  return {
    id: entry.id,
    user_id: userId,
    text: entry.text,
    mood: entry.mood,
    energy: entry.energy,
    source: "native",
    created_at: entry.createdAt,
    updated_at: new Date().toISOString()
  };
}

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    text: row.text,
    mood: row.mood as Mood,
    energy: row.energy,
    createdAt: row.created_at
  };
}

function letterToRow(userId: string, letter: Letter) {
  const period = splitPeriod(letter.periodLabel, letter.deliveredAt);
  return {
    id: letter.id,
    user_id: userId,
    period_start: period.start,
    period_end: period.end,
    delivered_at: dateKey(letter.deliveredAt),
    title: letter.title,
    body: letter.body,
    html: letter.body.replace(/\n/g, "<br>"),
    summary_json: { keyword: letter.keyword },
    themes: [],
    recommendations: [],
    postscript: letter.postscript || "",
    prompt_version: "native-rule-v1",
    updated_at: new Date().toISOString()
  };
}

function rowToLetter(row: LetterRow): Letter {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    periodLabel: `${row.period_start} ~ ${row.period_end}`,
    deliveredAt: `${row.delivered_at}T00:00:00.000Z`,
    keyword: row.summary_json?.keyword || "그때의 마음",
    postscript: row.postscript || ""
  };
}

function settingsToRow(userId: string, settings: NotificationSettings) {
  return {
    user_id: userId,
    enabled: settings.enabled,
    notifications_enabled: settings.enabled,
    start_time: settings.startTime,
    interval_minutes: settings.intervalMinutes,
    dnd_start: settings.dndStart,
    dnd_end: settings.dndEnd,
    timezone: "Asia/Seoul",
    updated_at: new Date().toISOString()
  };
}

function rowToSettings(row: NotificationSettingsRow): NotificationSettings {
  return {
    enabled: row.enabled,
    startTime: row.start_time.slice(0, 5),
    intervalMinutes: row.interval_minutes,
    dndStart: row.dnd_start.slice(0, 5),
    dndEnd: row.dnd_end.slice(0, 5)
  };
}

export function normalizeStateIds(state: AppState): AppState {
  return {
    ...state,
    entries: normalizeEntries(state.entries)
  };
}

export async function upsertProfile(user: User) {
  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

export async function pushAppState(userId: string, state: AppState) {
  const normalized = normalizeStateIds(state);

  if (normalized.entries.length) {
    const { error } = await supabase.from("entries").upsert(normalized.entries.map((entry) => entryToRow(userId, entry)));
    if (error) throw { ...error, message: `entries 저장 실패: ${error.message}` };
  }

  if (normalized.letters.length) {
    const { error } = await supabase.from("letters").upsert(normalized.letters.map((letter) => letterToRow(userId, letter)));
    if (error) throw { ...error, message: `letters 저장 실패: ${error.message}` };
  }

  const { error: notificationError } = await supabase.from("notification_settings").upsert(settingsToRow(userId, normalized.settings));
  if (notificationError) throw { ...notificationError, message: `notification_settings 저장 실패: ${notificationError.message}` };

  const { error: settingsError } = await supabase.from("app_settings").upsert({
    user_id: userId,
    preferences: {
      theme: normalized.theme,
      energyColorMode: normalized.energyColorMode,
      calendarEnergyMode: normalized.calendarEnergyMode
    },
    updated_at: new Date().toISOString()
  });
  if (settingsError) throw { ...settingsError, message: `app_settings 저장 실패: ${settingsError.message}` };

  return normalized;
}

export async function pullAppState(userId: string, local: AppState): Promise<AppState> {
  const [
    entriesResult,
    lettersResult,
    notificationResult,
    settingsResult
  ] = await Promise.all([
    supabase.from("entries").select("id,text,mood,energy,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("letters").select("id,title,body,period_start,period_end,delivered_at,summary_json,postscript").eq("user_id", userId).order("delivered_at", { ascending: false }),
    supabase.from("notification_settings").select("enabled,start_time,interval_minutes,dnd_start,dnd_end").eq("user_id", userId).maybeSingle(),
    supabase.from("app_settings").select("preferences").eq("user_id", userId).maybeSingle()
  ]);

  if (entriesResult.error) throw { ...entriesResult.error, message: `entries 불러오기 실패: ${entriesResult.error.message}` };
  if (lettersResult.error) throw { ...lettersResult.error, message: `letters 불러오기 실패: ${lettersResult.error.message}` };
  if (notificationResult.error) throw { ...notificationResult.error, message: `notification_settings 불러오기 실패: ${notificationResult.error.message}` };
  if (settingsResult.error) throw { ...settingsResult.error, message: `app_settings 불러오기 실패: ${settingsResult.error.message}` };

  const preferences = (settingsResult.data as AppSettingsRow | null)?.preferences || {};

  return {
    ...local,
    entries: ((entriesResult.data || []) as EntryRow[]).map(rowToEntry),
    letters: ((lettersResult.data || []) as LetterRow[]).map(rowToLetter),
    settings: notificationResult.data ? rowToSettings(notificationResult.data as NotificationSettingsRow) : local.settings,
    theme: preferences.theme || local.theme,
    energyColorMode: preferences.energyColorMode || local.energyColorMode,
    calendarEnergyMode: preferences.calendarEnergyMode || local.calendarEnergyMode
  };
}

export async function syncAppState(user: User, local: AppState): Promise<AppState> {
  try {
    await upsertProfile(user);
  } catch (error) {
    console.warn("Supabase profile upsert skipped", error);
  }
  const normalized = await pushAppState(user.id, local);
  return pullAppState(user.id, normalized);
}

export async function upsertEntry(userId: string, entry: Entry) {
  const normalized = isUuid(entry.id) ? entry : { ...entry, id: createId() };
  const { error } = await supabase.from("entries").upsert(entryToRow(userId, normalized));
  if (error) throw { ...error, message: `entries 저장 실패: ${error.message}` };
  return normalized;
}

export async function deleteRemoteEntries(userId: string, entryIds: string[]) {
  const ids = entryIds.filter(isUuid);
  if (!ids.length) return;
  const { error } = await supabase.from("entries").delete().eq("user_id", userId).in("id", ids);
  if (error) throw error;
}

export async function upsertRemoteSettings(userId: string, state: AppState) {
  await pushAppState(userId, state);
}
