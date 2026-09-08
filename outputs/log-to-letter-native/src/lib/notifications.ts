import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationSettings } from "../types/domain";
import { createNotificationPromptSelector } from "./notificationPrompts";

const NOTIFICATION_IDS_KEY = "log-to-letter-notification-ids-v1";
const NOTIFICATION_SCHEDULE_KEY = "log-to-letter-notification-schedule-v2";
const MAX_DAILY_NOTIFICATIONS = 12;
const MAX_FIXED_TIMES = 5;
const MIN_INTERVAL_MINUTES = 10;
const MAX_INTERVAL_MINUTES = 120;
const INTERVAL_STEP_MINUTES = 5;
const ANDROID_NOTIFICATION_CHANNEL_ID = "log-reminders";
const LOG_NOTIFICATION_PROMPT_VERSION = "record-prompt-v2";
const MONTHLY_PLANET_PROMPT_VERSION = "monthly-planet-v2";
const MONTH_END_SETTINGS_PROMPT_VERSION = "month-end-settings-v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function getTimeWindow(startText: string, endText: string) {
  const start = parseTime(startText);
  const rawEnd = parseTime(endText);
  if (start === null || rawEnd === null || start === rawEnd) return null;
  return { start, end: rawEnd > start ? rawEnd : rawEnd + 24 * 60 };
}

function normalizeIntervalMinutes(value: number) {
  const clamped = Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, Number(value) || MAX_INTERVAL_MINUTES));
  return Math.round((clamped - MIN_INTERVAL_MINUTES) / INTERVAL_STEP_MINUTES) * INTERVAL_STEP_MINUTES + MIN_INTERVAL_MINUTES;
}

function getScheduleMinutes(settings: NotificationSettings) {
  const window = getTimeWindow(settings.startTime, settings.endTime);
  const interval = normalizeIntervalMinutes(settings.intervalMinutes);
  if (!window) return [];

  const times: number[] = [];
  for (let minute = window.start; minute < window.end && times.length < MAX_DAILY_NOTIFICATIONS; minute += interval) {
    times.push(minute % (24 * 60));
  }
  return times;
}

function randomInteger(min: number, max: number) {
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function getRandomMinutes(startText: string, endText: string, requestedCount: number) {
  const window = getTimeWindow(startText, endText);
  if (!window) return [];
  const duration = window.end - window.start;
  const count = Math.max(1, Math.min(MAX_DAILY_NOTIFICATIONS, requestedCount, Math.floor((duration - 1) / 60) + 1));
  if (count === 1) return [window.start + randomInteger(0, Math.max(0, duration - 1))];

  const gapCount = count - 1;
  const targetSpan = randomInteger(gapCount * 60, Math.min(duration - 1, gapCount * 180));
  const startOffset = randomInteger(0, Math.max(0, duration - targetSpan - 1));
  const times = [window.start + startOffset];
  let remainingSpan = targetSpan;

  for (let index = 0; index < gapCount; index += 1) {
    const remainingGaps = gapCount - index - 1;
    const minGap = Math.max(60, remainingSpan - remainingGaps * 180);
    const maxGap = Math.min(180, remainingSpan - remainingGaps * 60);
    const gap = index === gapCount - 1 ? remainingSpan : randomInteger(minGap, maxGap);
    times.push(times[times.length - 1] + gap);
    remainingSpan -= gap;
  }
  return times;
}

function getRandomSchedule(settings: NotificationSettings) {
  const weekdays = (settings.weekdays?.length ? settings.weekdays : [1, 2, 3, 4, 5, 6, 7])
    .filter((day) => day >= 1 && day <= 7);
  return weekdays.flatMap((weekday) => getRandomMinutes(
    settings.randomStartTime,
    settings.randomEndTime,
    settings.randomDailyCount
  ).map((absoluteMinute) => ({
    weekday: ((weekday - 1 + Math.floor(absoluteMinute / (24 * 60))) % 7) + 1,
    minuteOfDay: absoluteMinute % (24 * 60)
  }))).slice(0, 60);
}

function getFixedSchedule(settings: NotificationSettings) {
  const weekdays = (settings.weekdays?.length ? settings.weekdays : [1, 2, 3, 4, 5, 6, 7])
    .filter((day) => day >= 1 && day <= 7);
  const times = (settings.fixedTimes?.length ? settings.fixedTimes : ["10:00"])
    .slice(0, MAX_FIXED_TIMES)
    .map(parseTime)
    .filter((time): time is number => time !== null);

  return weekdays.flatMap((weekday) => times.map((minuteOfDay) => ({ weekday, minuteOfDay })));
}

function getNextMonthEndNotificationDate(now = new Date()) {
  let notificationDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 13, 9, 0, 0);
  if (notificationDate.getTime() <= now.getTime()) {
    notificationDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 13, 9, 0, 0);
  }
  return notificationDate;
}

async function saveScheduledIds(ids: string[]) {
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
}

type StoredNotificationSchedule = {
  ids: string[];
  reminderCount: number;
  signature: string;
};

function getNotificationScheduleSignature(settings: NotificationSettings) {
  return JSON.stringify({
    enabled: settings.enabled,
    scheduleMode: settings.scheduleMode,
    startTime: settings.startTime,
    endTime: settings.endTime,
    intervalMinutes: normalizeIntervalMinutes(settings.intervalMinutes),
    weekdays: [...(settings.weekdays || [])].sort((left, right) => left - right),
    fixedTimes: settings.fixedTimes || [],
    randomStartTime: settings.randomStartTime,
    randomEndTime: settings.randomEndTime,
    randomDailyCount: settings.randomDailyCount,
    promptVersion: LOG_NOTIFICATION_PROMPT_VERSION,
    monthlyPromptVersion: MONTHLY_PLANET_PROMPT_VERSION,
    monthEndPromptVersion: MONTH_END_SETTINGS_PROMPT_VERSION
  });
}

async function saveStoredSchedule(schedule: StoredNotificationSchedule | null) {
  if (!schedule) {
    await AsyncStorage.removeItem(NOTIFICATION_SCHEDULE_KEY);
    return;
  }
  await AsyncStorage.setItem(NOTIFICATION_SCHEDULE_KEY, JSON.stringify(schedule));
}

async function getStoredSchedule(): Promise<StoredNotificationSchedule | null> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_SCHEDULE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredNotificationSchedule>;
    if (!Array.isArray(parsed.ids) || typeof parsed.signature !== "string") return null;
    return {
      ids: parsed.ids.filter((id): id is string => typeof id === "string"),
      reminderCount: Number(parsed.reminderCount) || 0,
      signature: parsed.signature
    };
  } catch {
    return null;
  }
}

async function getScheduledIds() {
  const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function cancelLogNotifications() {
  const storedSchedule = await getStoredSchedule();
  const ids = Array.from(new Set([...(storedSchedule?.ids || []), ...await getScheduledIds()]));
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await saveScheduledIds([]);
  await saveStoredSchedule(null);
}

export async function getNotificationPermissionStatus() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted ? "허용됨" : permission.canAskAgain ? "요청 가능" : "차단됨";
}

export async function getScheduledLogNotificationCount() {
  const storedSchedule = await getStoredSchedule();
  const ids = new Set(storedSchedule?.ids || await getScheduledIds());
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((notification) => ids.has(notification.identifier)).length;
}

export async function ensureLogNotifications(settings: NotificationSettings) {
  if (!settings.enabled) {
    await cancelLogNotifications();
    return { status: "꺼짐", count: 0 };
  }

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    return { status: permission.canAskAgain ? "권한 필요" : "권한 차단됨", count: 0 };
  }

  const storedSchedule = await getStoredSchedule();
  const signature = getNotificationScheduleSignature(settings);
  if (storedSchedule?.signature === signature && storedSchedule.ids.length > 0) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((notification) => notification.identifier));
    if (storedSchedule.ids.every((id) => scheduledIds.has(id))) {
      return { status: "예약 유지됨", count: storedSchedule.reminderCount };
    }
  }

  return scheduleLogNotifications(settings);
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: "기록 알림",
    importance: Notifications.AndroidImportance.DEFAULT
  });
}

export async function scheduleTestLogNotification() {
  await ensureAndroidNotificationChannel();
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return permission.canAskAgain ? "권한 필요" : "권한 차단됨";
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Log Planet",
      body: "테스트 알림이야. 지금 무슨 생각하고 있어?",
      data: { screen: "capture", test: true }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      channelId: Platform.OS === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined
    }
  });

  return "10초 뒤 테스트 알림을 보낼게.";
}

export async function scheduleLogNotifications(settings: NotificationSettings) {
  await cancelLogNotifications();
  if (!settings.enabled) return { status: "꺼짐", count: 0 };

  await ensureAndroidNotificationChannel();

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return { status: permission.canAskAgain ? "권한 필요" : "권한 차단됨", count: 0 };
  }

  const promptAt = createNotificationPromptSelector();
  const weeklySchedule = settings.scheduleMode === "fixed"
    ? getFixedSchedule(settings)
    : settings.scheduleMode === "random"
      ? getRandomSchedule(settings)
      : null;
  const reminderIds = weeklySchedule
    ? await Promise.all(weeklySchedule.map(({ weekday, minuteOfDay }) => {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const prompt = promptAt(minuteOfDay);
      return Notifications.scheduleNotificationAsync({
        content: {
          title: "Log Planet",
          body: prompt.body,
          data: {
            screen: "capture",
            promptId: prompt.id,
            promptVersion: LOG_NOTIFICATION_PROMPT_VERSION
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          channelId: Platform.OS === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined
        }
      });
    }))
    : await Promise.all(getScheduleMinutes(settings).map((minuteOfDay) => {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const prompt = promptAt(minuteOfDay);
      return Notifications.scheduleNotificationAsync({
        content: {
          title: "Log Planet",
          body: prompt.body,
          data: {
            screen: "capture",
            promptId: prompt.id,
            promptVersion: LOG_NOTIFICATION_PROMPT_VERSION
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined
        }
      });
    }));

  const monthlyPlanetId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Log Planet",
      body: "어제까지 완성된 기록 행성을 확인해봐🪐",
      data: {
        screen: "universe",
        monthOffset: -1,
        promptId: "monthly_planet_review",
        promptVersion: MONTHLY_PLANET_PROMPT_VERSION
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: 1,
      hour: 13,
      minute: 9,
      channelId: Platform.OS === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined
    }
  });

  const monthEndSettingsId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Log Planet",
      body: "내일부터 이어질 한달의 기록을 어떤 패턴으로 남길지, 알림 설정을 점검해봐.",
      data: {
        screen: "settings",
        promptId: "month_end_notification_settings",
        promptVersion: MONTH_END_SETTINGS_PROMPT_VERSION
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: getNextMonthEndNotificationDate(),
      channelId: Platform.OS === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined
    }
  });

  const ids = [...reminderIds, monthlyPlanetId, monthEndSettingsId];
  await saveScheduledIds(ids);
  await saveStoredSchedule({
    ids,
    reminderCount: reminderIds.length,
    signature: getNotificationScheduleSignature(settings)
  });
  return { status: "예약됨", count: reminderIds.length };
}
