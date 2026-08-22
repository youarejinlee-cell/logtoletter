import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationSettings } from "../types/domain";

const NOTIFICATION_IDS_KEY = "log-to-letter-notification-ids-v1";
const MAX_DAILY_NOTIFICATIONS = 12;
const MAX_FIXED_TIMES = 5;
const MIN_INTERVAL_MINUTES = 10;
const MAX_INTERVAL_MINUTES = 120;
const INTERVAL_STEP_MINUTES = 5;
const ANDROID_NOTIFICATION_CHANNEL_ID = "log-reminders";
const LOG_NOTIFICATION_PROMPT_VERSION = "record-prompt-v1";
const MONTHLY_PLANET_PROMPT_VERSION = "monthly-planet-v1";

const LOG_NOTIFICATION_PROMPTS = [
  { id: "thought_now", body: "지금 무슨 생각하고 있어?" },
  { id: "quick_thought", body: "방금 딱 생각하고 있었던 거, 짧게 기록해봐!" },
  { id: "fill_planet", body: "이번에는 어떤 기록으로 행성을 채워볼까?" },
  { id: "emotion_curiosity", body: "나는 어떤 감정을 가장 많이 느낄까 궁금하지 않아?" },
  { id: "today_joy", body: "오늘 나를 즐겁게 했던 게 있다면 기록으로 남겨봐." },
  { id: "future_self", body: "나중의 내가 알았으면 하는 지금 나의 생각이 있다면 기록해봐." },
  { id: "fun_story", body: "재밌는 일 있으면 얘기 좀..." },
  { id: "planet_knows", body: "행성은 답을 알고 있다(진지)" },
  { id: "hard_to_say", body: "입 밖으로 내기 어려운 이야기가 있다면... 여기 나의 행성이 있어!" },
  { id: "earth_turns", body: "기록하지 않아도 지구는 돈다!" },
  { id: "anything_new", body: "별일 없지...?(아련)" },
  { id: "knock_knock", body: "똑똑, 기록할 시간이에요~" }
] as const;

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

async function saveScheduledIds(ids: string[]) {
  await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
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
  const ids = await getScheduledIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await saveScheduledIds([]);
}

export async function getNotificationPermissionStatus() {
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted ? "허용됨" : permission.canAskAgain ? "요청 가능" : "차단됨";
}

export async function getScheduledLogNotificationCount() {
  const ids = await getScheduledIds();
  return ids.length;
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

  const promptOffset = Math.floor(Math.random() * LOG_NOTIFICATION_PROMPTS.length);
  const promptAt = (index: number) => LOG_NOTIFICATION_PROMPTS[(promptOffset + index) % LOG_NOTIFICATION_PROMPTS.length];
  const weeklySchedule = settings.scheduleMode === "fixed"
    ? getFixedSchedule(settings)
    : settings.scheduleMode === "random"
      ? getRandomSchedule(settings)
      : null;
  const reminderIds = weeklySchedule
    ? await Promise.all(weeklySchedule.map(({ weekday, minuteOfDay }, index) => {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const prompt = promptAt(index);
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
    : await Promise.all(getScheduleMinutes(settings).map((minuteOfDay, index) => {
      const hour = Math.floor(minuteOfDay / 60);
      const minute = minuteOfDay % 60;
      const prompt = promptAt(index);
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
      hour: 8,
      minute: 24,
      channelId: Platform.OS === "android" ? ANDROID_NOTIFICATION_CHANNEL_ID : undefined
    }
  });

  await saveScheduledIds([...reminderIds, monthlyPlanetId]);
  return { status: "예약됨", count: reminderIds.length };
}
