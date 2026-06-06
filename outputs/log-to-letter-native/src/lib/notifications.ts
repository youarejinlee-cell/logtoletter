import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { NotificationSettings } from "../types/domain";

const NOTIFICATION_IDS_KEY = "log-to-letter-notification-ids-v1";
const MAX_DAILY_NOTIFICATIONS = 12;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

function isInDnd(minuteOfDay: number, dndStart: number, dndEnd: number) {
  if (dndStart === dndEnd) return false;
  if (dndStart < dndEnd) return minuteOfDay >= dndStart && minuteOfDay < dndEnd;
  return minuteOfDay >= dndStart || minuteOfDay < dndEnd;
}

function getScheduleMinutes(settings: NotificationSettings) {
  const start = parseTime(settings.startTime);
  const dndStart = parseTime(settings.dndStart);
  const dndEnd = parseTime(settings.dndEnd);
  const interval = Math.max(15, Math.min(360, Number(settings.intervalMinutes) || 120));
  if (start === null || dndStart === null || dndEnd === null) return [];

  const times: number[] = [];
  for (let minute = start; minute < 24 * 60 && times.length < MAX_DAILY_NOTIFICATIONS; minute += interval) {
    if (!isInDnd(minute, dndStart, dndEnd)) {
      times.push(minute);
    }
  }
  return times;
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

export async function scheduleLogNotifications(settings: NotificationSettings) {
  await cancelLogNotifications();
  if (!settings.enabled) return { status: "꺼짐", count: 0 };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("log-reminders", {
      name: "기록 알림",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return { status: permission.canAskAgain ? "권한 필요" : "권한 차단됨", count: 0 };
  }

  const times = getScheduleMinutes(settings);
  const ids = await Promise.all(times.map((minuteOfDay) => {
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    return Notifications.scheduleNotificationAsync({
      content: {
        title: "Log to Letter",
        body: "지금 무슨 생각하고 있어?",
        data: { screen: "capture" }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? "log-reminders" : undefined
      }
    });
  }));

  await saveScheduledIds(ids);
  return { status: "예약됨", count: ids.length };
}
