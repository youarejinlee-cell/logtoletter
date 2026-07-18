import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, StatusBar as NativeStatusBar, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { Session, User } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppleLoginButton } from "./src/components/AppleLoginButton";
import { GoogleLoginButton, KakaoLoginButton } from "./src/components/KakaoLoginButton";
import { AuthCard } from "./src/components/AuthCard";
import { BottomTabs, TabKey } from "./src/components/BottomTabs";
import { FirstRunGuideModal } from "./src/components/FirstRunGuideModal";
import { AccountScreen } from "./src/screens/AccountScreen";
import { AppSettingsScreen } from "./src/screens/AppSettingsScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { CaptureScreen } from "./src/screens/CaptureScreen";
import { DevConsoleScreen } from "./src/screens/DevConsoleScreen";
import { GuideScreen } from "./src/screens/GuideScreen";
import { InboxScreen } from "./src/screens/InboxScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SpaceBackdrop, UniverseScreen } from "./src/screens/UniverseScreen";
import { canUseDevTools } from "./src/lib/appVariant";
import { createId, isUuid } from "./src/lib/ids";
import { buildWeeklyLetter } from "./src/lib/letter";
import {
  cancelLogNotifications,
  getNotificationPermissionStatus,
  getScheduledLogNotificationCount,
  scheduleLogNotifications,
  scheduleTestLogNotification
} from "./src/lib/notifications";
import { deleteRemoteEntries, deleteRemoteUserData, generateDueLetters, normalizeStateIds, pullAppState, syncAppState, upsertEntry, upsertRemoteSettings } from "./src/lib/remoteSync";
import { claimGuestStorageNotice, completeFirstRunGuide, defaultState, hasCompletedFirstRunGuide, loadAppState, removeAppState, saveAppState } from "./src/lib/storage";
import { deleteAccount, getCurrentSession, signInWithApple, signInWithGoogle, signInWithKakao, signOut, supabase } from "./src/lib/supabase";
import { AppThemeProvider, cosmicTheme } from "./src/lib/theme";
import { AppState, Entry, Letter, Mood } from "./src/types/domain";

const topSafePadding = Platform.select({
  ios: 44,
  android: NativeStatusBar.currentHeight || 24,
  default: 24
});

const LETTER_ARCHIVE_ENABLED = false;

const tabHeaderMeta: Record<TabKey, { eyebrow: string; title: string; lead: string }> = {
  universe: { eyebrow: "PLANET", title: "행성", lead: "기록이 쌓이면 나만의 행성이 돼." },
  capture: { eyebrow: "LOG", title: "기록", lead: "지금 이 순간의 생각과 감정을 솔직하게 남겨봐." },
  calendar: { eyebrow: "COLLECTION", title: "모아보기", lead: "그날의 나는 무슨 생각을 했을까?" },
  inbox: { eyebrow: "LETTER", title: "편지보관함", lead: "지난 날의 네가 보낸 편지를 확인해봐." },
  collection: { eyebrow: "ANALYSIS", title: "분석 보기", lead: "남긴 기록을 여러 각도에서 다시 볼 수 있어." },
  settings: { eyebrow: "NOTIFICATION", title: "기록 알림 설정", lead: "순간의 생각을 기록할 수 있도록 앱 푸시를 보내줄게." },
  account: { eyebrow: "ACCOUNT", title: "계정", lead: "로그인과 데이터 관리를 여기에서 할 수 있어." },
  appSettings: { eyebrow: "SETTINGS", title: "설정", lead: "앱의 기록 경험을 나에게 맞게 조정해봐." },
  guide: { eyebrow: "GUIDE", title: "가이드", lead: "지금의 기록이 쌓여 너만의 행성이 되도록." },
  dev: { eyebrow: "DEVELOPMENT", title: "테스트 콘솔", lead: "개발 기능과 테스트 상태를 확인해." }
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentAppDate(state: AppState) {
  return canUseDevTools && state.testToday ? startOfDay(`${state.testToday}T00:00:00`) : startOfDay(new Date());
}

function nowForState(state: AppState) {
  if (!canUseDevTools || !state.testToday) return new Date();
  const now = new Date();
  return new Date(`${state.testToday}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`);
}

function entryAt(entry: Entry) {
  return startOfDay(entry.createdAt).getTime();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const details = error as { message?: string; code?: string; details?: string; hint?: string };
    return [
      details.message,
      details.code ? `code: ${details.code}` : null,
      details.details,
      details.hint ? `hint: ${details.hint}` : null
    ].filter(Boolean).join(" · ") || JSON.stringify(error);
  }
  return String(error || "서버 동기화에 실패했어.");
}

function confirmGuestEntryImport(entryCount: number) {
  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };
    Alert.alert(
      "기기에 남긴 기록 가져오기",
      `로그인하지 않고 남긴 기록 ${entryCount}개가 있어. 이 계정으로 가져올까?`,
      [
        { text: "가져오지 않기", style: "cancel", onPress: () => finish(false) },
        { text: "가져오기", onPress: () => finish(true) }
      ],
      { cancelable: true, onDismiss: () => finish(false) }
    );
  });
}

function sanitizeStateForVariant(state: AppState): AppState {
  return canUseDevTools ? state : { ...state, testToday: undefined };
}

function normalizeSavedLetterCopy(state: AppState): AppState {
  return {
    ...state,
    letters: state.letters.map((letter) => {
      const deliveredDate = dateKey(letter.deliveredAt);
      const isJuneSampleLetter = deliveredDate === "2026-06-08" || letter.periodLabel === "2026-06-01 ~ 2026-06-07";
      if (!isJuneSampleLetter) return letter;

      return {
        ...letter,
        title: letter.title === "작은 성공이라는 열매" || letter.title === "작게 해낸 날들"
          ? "작게 해낸 날들이 너를 조금 더 믿게 했어"
          : letter.title,
        keyword: "작게 해낸 날들"
      };
    })
  };
}

function reconcileLetters(state: AppState, today = currentAppDate(state)): AppState {
  if (!LETTER_ARCHIVE_ENABLED) return { ...state, letters: state.letters };
  if (!state.entries.length) return { ...state, letters: [] };

  const sortedEntries = [...state.entries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const firstInputDate = startOfDay(sortedEntries[0].createdAt);
  const validSendDates = new Set<string>();

  for (let sendDate = addDays(firstInputDate, 7); sendDate.getTime() <= today.getTime(); sendDate = addDays(sendDate, 7)) {
    validSendDates.add(dateKey(sendDate));
  }

  const generated = state.letters.filter((letter) => validSendDates.has(dateKey(letter.deliveredAt)) && letter.id === `letter-${dateKey(letter.deliveredAt)}`);
  const existingIds = new Set(generated.map((letter) => letter.id));

  for (let sendDate = addDays(firstInputDate, 7); sendDate.getTime() <= today.getTime(); sendDate = addDays(sendDate, 7)) {
    const periodStart = addDays(sendDate, -7);
    const periodEnd = sendDate;
    const id = `letter-${dateKey(sendDate)}`;
    if (existingIds.has(id)) continue;

    const periodEntries = sortedEntries.filter((entry) => {
      const time = entryAt(entry);
      return time >= periodStart.getTime() && time < periodEnd.getTime();
    });
    generated.push(buildWeeklyLetter(periodEntries, periodStart, sendDate, id));
    existingIds.add(id);
  }

  return {
    ...state,
    letters: generated.sort((a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime())
  };
}

const storeSampleEntries: Array<Omit<Entry, "id">> = [
  {
    text: "아침에 눈뜨자마자 마음이 조금 가벼웠어. 이번 달은 작은 기록부터 해보자는 생각이 들었어.",
    mood: "hopeful",
    energy: 4,
    createdAt: "2026-05-01T08:40:00"
  },
  {
    text: "정리해둔 할 일을 하나 끝냈어. 별일 아닌데도 오늘의 방향이 잡히는 느낌이 있었어.",
    mood: "proud",
    energy: 4,
    createdAt: "2026-05-02T14:10:00"
  },
  {
    text: "연휴가 끝나가는 게 아쉬웠어. 쉬고 싶은 마음과 다시 움직여야 한다는 마음이 같이 있었어.",
    mood: "complex",
    energy: 3,
    createdAt: "2026-05-04T19:05:00"
  },
  {
    text: "점심을 천천히 먹었더니 생각이 덜 급해졌어. 몸이 느려지니까 마음도 조금 따라왔어.",
    mood: "peaceful",
    energy: 4,
    createdAt: "2026-05-05T13:20:00"
  },
  {
    text: "회의 전에 긴장했는데 막상 시작하니 괜찮았어. 걱정이 실제보다 먼저 커지는 것 같아.",
    mood: "worried",
    energy: 2,
    createdAt: "2026-05-06T10:30:00"
  },
  {
    text: "오늘은 무덤덤했어. 감정이 크지 않은 날도 기록해두면 나중에 흐름이 보일 것 같아.",
    mood: "indifferent",
    energy: 3,
    createdAt: "2026-05-07T21:00:00"
  },
  {
    text: "친구가 해준 말이 오래 남았어. 내가 너무 혼자 결론을 내리려고 했던 것 같아.",
    mood: "moved",
    energy: 4,
    createdAt: "2026-05-08T20:35:00"
  },
  {
    text: "괜히 비교하는 마음이 올라왔어. 부러운 장면 뒤에 내가 바라는 생활이 숨어 있는 것 같아.",
    mood: "envious",
    energy: 2,
    createdAt: "2026-05-09T17:25:00"
  },
  {
    text: "산책하면서 생각이 조금 정리됐어. 움직여야 머릿속 말들이 조용해지는 날이 있네.",
    mood: "calm",
    energy: 4,
    createdAt: "2026-05-10T18:50:00"
  },
  {
    text: "해야 할 일을 미루다가 결국 하나만 끝냈어. 작게라도 해내니 마음이 덜 무거웠어.",
    mood: "selfEsteem",
    energy: 4,
    createdAt: "2026-05-11T22:15:00"
  },
  {
    text: "오늘은 말 한마디가 계속 마음에 걸렸어. 내가 원했던 건 사과보다 이해였던 것 같아.",
    mood: "sensitive",
    energy: 2,
    createdAt: "2026-05-12T16:45:00"
  },
  {
    text: "아까 먹은 빵이 생각보다 맛있어서 기분이 좋아졌어. 작은 만족이 하루를 살짝 바꿨어.",
    mood: "happy",
    energy: 5,
    createdAt: "2026-05-13T15:10:00"
  },
  {
    text: "오늘은 배운 게 있었어. 내가 힘들다고 느끼는 순간에는 보통 기준이 너무 높아져 있었어.",
    mood: "instructive",
    energy: 3,
    createdAt: "2026-05-14T21:40:00"
  },
  {
    text: "답장이 늦어지니까 마음이 흔들렸어. 내가 원하는 관계의 속도를 더 잘 알아야겠어.",
    mood: "anxious",
    energy: 2,
    createdAt: "2026-05-15T23:05:00"
  },
  {
    text: "오전에 칭찬을 받았는데 오래 기억하고 싶었어. 그냥 운이 아니라 내가 준비한 것도 있었어.",
    mood: "grateful",
    energy: 5,
    createdAt: "2026-05-16T11:25:00"
  },
  {
    text: "주말인데도 일 생각이 들어왔어. 쉬는 중에도 잘해야 한다는 마음이 남아 있었어.",
    mood: "tired",
    energy: 2,
    createdAt: "2026-05-17T12:15:00"
  },
  {
    text: "오늘은 머리가 멍했어. 생각을 정리하려고 하기보다 일단 잠을 먼저 챙겨야 할 것 같아.",
    mood: "blank",
    energy: 1,
    createdAt: "2026-05-19T22:30:00"
  },
  {
    text: "새로 산 작은 물건이 마음에 들었어. 내가 좋아하는 취향을 알아가는 느낌이 있었어.",
    mood: "delight",
    energy: 4,
    createdAt: "2026-05-20T18:20:00"
  },
  {
    text: "사람들 앞에서 괜찮은 척하느라 피곤했어. 사실은 조금 어렵다고 말하고 싶었어.",
    mood: "difficult",
    energy: 2,
    createdAt: "2026-05-21T20:05:00"
  },
  {
    text: "오늘은 궁금한 마음이 컸어. 내가 반복해서 끌리는 것들이 결국 내 욕망을 보여주는 것 같아.",
    mood: "curious",
    energy: 4,
    createdAt: "2026-05-22T14:55:00"
  },
  {
    text: "걱정이 올라왔지만 바로 휩쓸리진 않았어. 걱정이 알려주는 방향만 조용히 적어뒀어.",
    mood: "accepting",
    energy: 3,
    createdAt: "2026-05-23T19:30:00"
  },
  {
    text: "오랜만에 재밌는 얘기를 많이 했어. 웃고 나니 생각이 덜 딱딱해졌어.",
    mood: "fun",
    energy: 5,
    createdAt: "2026-05-24T22:05:00"
  },
  {
    text: "오전 회의에서 준비한 내용을 차분하게 설명했어. 잘해내고 싶은 마음이 조금 덜 날카로웠어.",
    mood: "proud",
    energy: 5,
    createdAt: "2026-05-25T09:20:00"
  },
  {
    text: "답장을 기다리면서 내가 원하는 게 뭔지 계속 생각했어. 그냥 확인받고 싶었던 걸지도 몰라.",
    mood: "anxious",
    energy: 2,
    createdAt: "2026-05-26T21:10:00"
  },
  {
    text: "오늘은 서운한 마음이 올라왔는데, 바로 말하기보다 내가 바라는 관계의 모양을 먼저 적어봤어.",
    mood: "reflective",
    energy: 3,
    createdAt: "2026-05-27T18:40:00"
  },
  {
    text: "퇴근길에 산책을 했더니 머리가 조금 맑아졌어. 몸이 먼저 쉬고 싶다고 말한 것 같아.",
    mood: "calm",
    energy: 4,
    createdAt: "2026-05-28T20:15:00"
  },
  {
    text: "마감 생각이 계속 따라와서 예민했어. 일을 잘하고 싶은 마음이 자꾸 몸을 조이는 것 같아.",
    mood: "sensitive",
    energy: 2,
    createdAt: "2026-05-29T16:05:00"
  },
  {
    text: "친구랑 짧게 통화했는데 이상하게 마음이 풀렸어. 별말 아닌 대화가 필요했나봐.",
    mood: "grateful",
    energy: 4,
    createdAt: "2026-05-31T11:30:00"
  },
  {
    text: "하루 종일 이것저것 해냈는데도 어딘가 부족한 느낌이 있었어. 기준을 조금 낮춰도 괜찮을 것 같아.",
    mood: "reflective",
    energy: 3,
    createdAt: "2026-05-30T20:45:00"
  },
  {
    text: "아침에 해야 할 일을 세 개로만 나누니까 시작이 쉬웠어. 작은 단위로 해내는 게 나한테 맞는 것 같아.",
    mood: "hopeful",
    energy: 4,
    createdAt: "2026-06-01T09:05:00"
  },
  {
    text: "오늘은 괜히 비교하는 마음이 올라왔어. 부러움 뒤에 내가 원하는 장면이 숨어 있는 것 같아.",
    mood: "envious",
    energy: 2,
    createdAt: "2026-06-02T17:45:00"
  },
  {
    text: "쇼츠에서 본 정리법을 따라 해봤는데 생각보다 재밌었어. 일단 눈앞에 보이게 만드는 게 도움이 됐어.",
    mood: "fun",
    energy: 5,
    createdAt: "2026-06-03T22:00:00"
  },
  {
    text: "몸이 너무 피곤해서 기록도 짧게 남겨. 오늘은 더 밀어붙이면 안 될 것 같아.",
    mood: "tired",
    energy: 1,
    createdAt: "2026-06-04T23:10:00"
  },
  {
    text: "점심에 먹은 파스타가 생각보다 좋았어. 이런 작은 만족도 하루를 바꿀 수 있네.",
    mood: "happy",
    energy: 4,
    createdAt: "2026-06-05T13:25:00"
  },
  {
    text: "칭찬을 받았는데 바로 넘기지 않고 기록해두고 싶었어. 오늘의 나는 꽤 잘 버텼어.",
    mood: "proud",
    energy: 5,
    createdAt: "2026-06-06T09:43:00"
  },
  {
    text: "오후에는 다시 걱정이 올라왔어. 그래도 걱정의 방향을 보니 내가 중요하게 여기는 게 보였어.",
    mood: "worried",
    energy: 2,
    createdAt: "2026-06-06T17:55:00"
  },
  {
    text: "밤에는 마음이 조금 조용해졌어. 오늘 기록들을 보니 에너지가 오르내린 이유가 선명해.",
    mood: "accepting",
    energy: 3,
    createdAt: "2026-06-06T22:12:00"
  },
  {
    text: "새로운 장소에서 커피를 마셨는데 기분이 환기됐어. 내가 생각보다 작은 변화를 좋아하나봐.",
    mood: "excited",
    energy: 5,
    createdAt: "2026-06-07T15:20:00"
  },
  {
    text: "대화 중에 내가 원하는 걸 흐리게 말하고 있다는 걸 알았어. 다음에는 조금 더 직접 말해보고 싶어.",
    mood: "curious",
    energy: 3,
    createdAt: "2026-06-09T19:05:00"
  },
  {
    text: "오늘은 무덤덤했어. 특별히 좋은 것도 나쁜 것도 없었지만, 이런 날도 기록으로 남겨두면 흐름이 보이겠지.",
    mood: "indifferent",
    energy: 3,
    createdAt: "2026-06-10T12:30:00"
  },
  {
    text: "작게 미뤄둔 일을 끝냈어. 대단한 일은 아니지만 나를 조금 믿어도 되겠다는 생각이 들었어.",
    mood: "selfEsteem",
    energy: 4,
    createdAt: "2026-06-11T18:18:00"
  }
];

const storeSampleLetters: Letter[] = [
  {
    id: "letter-2026-06-01",
    title: "잘하려는 마음 사이에서 쉬는 법을 찾고 있었어",
    keyword: "잘하려는 마음",
    periodLabel: "2026-05-25 ~ 2026-05-31",
    deliveredAt: "2026-06-01T00:00:00",
    body: "이번 주의 너는 일을 잘 해내고 싶은 마음과 관계 안에서 확인받고 싶은 마음 사이를 오가고 있었어.\n\n회의를 준비하고, 마감 생각에 예민해지고, 답장을 기다리며 네가 원하는 것이 무엇인지 생각했던 기록들이 이어져 있었어. 기록 속 에너지는 높았다가 낮아졌지만, 그 아래에는 공통적으로 “잘하고 싶다”는 마음이 있었어.\n\n흥미로운 건 네가 마음을 밀어붙일 때보다, 산책을 하거나 친구와 짧게 대화했을 때 조금 더 안정됐다는 점이야. 너는 혼자 더 세게 버티는 방식보다, 생각을 밖으로 꺼내고 몸을 움직일 때 회복되는 사람일지도 몰라.\n\n다음 주에는 잘해야 한다는 마음이 올라올 때 바로 결론을 내리지 말고, 지금 내가 원하는 것이 무엇인지 한 문장으로 먼저 적어봐. 원하는 것을 알아차리는 일이 다음 행동을 고르는 첫 단서가 될 거야."
  },
  {
    id: "letter-2026-06-08",
    title: "작게 해낸 날들이 너를 조금 더 믿게 했어",
    keyword: "작게 해낸 날들",
    periodLabel: "2026-06-01 ~ 2026-06-07",
    deliveredAt: "2026-06-08T00:00:00",
    body: "이번 주 기록에서는 작은 단위로 시작했을 때 너의 에너지가 살아나는 장면이 눈에 띄었어.\n\n해야 할 일을 세 개로 나눴던 아침, 쇼츠에서 본 정리법을 따라 해본 밤, 칭찬을 그냥 넘기지 않고 기록해둔 순간이 있었어. 반대로 몸이 피곤했던 날에는 에너지가 확 낮아졌고, 비교하는 마음이나 걱정이 올라왔던 기록도 함께 남아 있었어.\n\n이번 주의 핵심은 기분을 좋게 유지하는 것이 아니라, 에너지가 움직이는 조건을 알아차린 데 있어. 너는 막연히 버티는 것보다 눈앞에 보이게 정리하고, 작은 행동을 끝냈을 때 스스로를 조금 더 믿게 되는 것 같아.\n\n다음 주에는 기록할 때 “지금 내가 할 수 있는 가장 작은 행동은 뭐지?”를 같이 적어봐. 큰 결심보다 작은 실행이 너를 더 안정적으로 움직이게 할 수 있어."
  }
];

export default function App() {
  const [tab, setTab] = useState<TabKey>("universe");
  const [state, setState] = useState<AppState>(defaultState);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarFocusDate, setCalendarFocusDate] = useState<string | undefined>();
  const [hydrated, setHydrated] = useState(false);
  const [storageUserId, setStorageUserId] = useState<string | null | undefined>(undefined);
  const [authChoiceVisible, setAuthChoiceVisible] = useState(false);
  const [guestBrowsePromptVisible, setGuestBrowsePromptVisible] = useState(false);
  const [firstRunGuideVisible, setFirstRunGuideVisible] = useState(false);
  const [firstRunGuideResolved, setFirstRunGuideResolved] = useState(false);
  const [guestBrowseTimerReady, setGuestBrowseTimerReady] = useState(false);
  const activeUserIdRef = useRef<string | null | undefined>(undefined);
  const scopeRequestRef = useRef(0);
  const loginInProgressRef = useRef(false);
  const guestStorageNoticeRef = useRef(false);
  const guestBrowsePromptShownRef = useRef(false);
  const letters = state.letters;
  const theme = cosmicTheme;
  const activeTab = (!canUseDevTools && tab === "dev") || (!LETTER_ARCHIVE_ENABLED && tab === "inbox") ? "universe" : tab;
  const activeHeader = tabHeaderMeta[activeTab];

  useEffect(() => {
    const openNotificationTarget = (response: Notifications.NotificationResponse | null) => {
      if (response?.notification.request.content.data?.screen !== "capture") return;
      setTab("capture");
      setMenuOpen(false);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationTarget);
    Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        openNotificationTarget(response);
        if (response) await Notifications.clearLastNotificationResponseAsync();
      })
      .catch((error) => console.warn("Notification response check failed", error));

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    hasCompletedFirstRunGuide()
      .then((completed) => {
        setFirstRunGuideVisible(!completed);
        setGuestBrowseTimerReady(completed);
      })
      .catch(() => setFirstRunGuideVisible(true))
      .finally(() => setFirstRunGuideResolved(true));
  }, []);

  useEffect(() => {
    if (firstRunGuideResolved) void SplashScreen.hideAsync();
  }, [firstRunGuideResolved]);

  const activateLocalScope = async (nextUser: User | null, migrateLegacy = false, providedState?: AppState) => {
    const requestId = ++scopeRequestRef.current;
    const nextUserId = nextUser?.id || null;
    setHydrated(false);
    setState(sanitizeStateForVariant(defaultState));

    const loaded = providedState || await loadAppState(nextUserId, { migrateLegacy });
    if (requestId !== scopeRequestRef.current) return;

    activeUserIdRef.current = nextUserId;
    setState(reconcileLetters(normalizeSavedLetterCopy(sanitizeStateForVariant(normalizeStateIds(loaded)))));
    setUser(nextUser);
    setStorageUserId(nextUserId);
    setCalendarFocusDate(undefined);
    setHydrated(true);
  };

  useEffect(() => {
    getCurrentSession()
      .then((session) => activateLocalScope(session?.user || null, true))
      .catch(() => activateLocalScope(null, true));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (event === "SIGNED_IN" && loginInProgressRef.current) return;
      const nextUser = session?.user || null;
      const nextUserId = nextUser?.id || null;
      if (activeUserIdRef.current === nextUserId) {
        setUser(nextUser);
        return;
      }
      void activateLocalScope(nextUser);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || storageUserId === undefined) return;
    const timer = setTimeout(() => {
      saveAppState(state, storageUserId);
    }, 300);
    return () => clearTimeout(timer);
  }, [hydrated, state, storageUserId]);

  useEffect(() => {
    if (user) {
      setGuestBrowsePromptVisible(false);
      return;
    }
    if (!hydrated || storageUserId !== null || !guestBrowseTimerReady || guestBrowsePromptShownRef.current) return;

    const timer = setTimeout(() => {
      guestBrowsePromptShownRef.current = true;
      setGuestBrowsePromptVisible(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, [guestBrowseTimerReady, hydrated, storageUserId, user]);

  const dismissFirstRunGuide = () => {
    setFirstRunGuideVisible(false);
    setGuestBrowseTimerReady(true);
    void completeFirstRunGuide();
  };

  const runFullSync = async (targetUser = user, targetState = state) => {
    if (!targetUser) return;
    setSyncStatus("동기화 중");
    setAuthError(null);
    try {
      const synced = await syncAppState(targetUser, targetState);
      let nextState = synced;
      if (LETTER_ARCHIVE_ENABLED) {
        try {
          const result = await generateDueLetters(canUseDevTools ? targetState.testToday : undefined);
          if ((result.generated || 0) + (result.updated || 0) > 0) {
            nextState = await pullAppState(targetUser.id, synced);
          }
        } catch (letterError) {
          console.warn("AI letter generation failed", letterError);
          setAuthError(`AI 편지 생성 실패: ${getErrorMessage(letterError)}`);
        }
      }
      setState(reconcileLetters(normalizeSavedLetterCopy(nextState)));
      setSyncStatus("완료");
    } catch (error) {
      console.warn("Supabase sync failed", error);
      setSyncStatus("실패");
      setAuthError(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!hydrated || !user || storageUserId !== user.id) return;
    runFullSync(user, state);
  }, [hydrated, storageUserId, user?.id]);

  const addEntry = (entry: Entry) => {
    const normalized = { ...entry, id: isUuid(entry.id) ? entry.id : createId() };
    setCalendarFocusDate(dateKey(entry.createdAt));
    setState((current) => reconcileLetters({
      ...current,
      entries: [normalized, ...current.entries]
    }));
    if (user) {
      setSyncStatus("기록 저장 중");
      setAuthError(null);
      upsertEntry(user.id, normalized)
        .then(() => setSyncStatus("기록 저장 완료"))
        .catch((error) => {
          console.warn("Supabase entry upsert failed", error);
          setSyncStatus("실패");
          setAuthError(getErrorMessage(error));
        });
    } else if (!guestStorageNoticeRef.current) {
      guestStorageNoticeRef.current = true;
      void claimGuestStorageNotice()
        .then((shouldShow) => {
          if (!shouldShow) return;
          Alert.alert(
            "이 기록은 현재 기기에만 저장돼",
            "로그인하지 않은 기록은 앱을 삭제하거나 기기를 바꾸면 복구할 수 없어. 로그인하면 안전하게 보관하고 행성으로 불러올 수 있어.",
            [
              { text: "나중에", style: "cancel" },
              { text: "로그인", onPress: () => setAuthChoiceVisible(true) }
            ]
          );
        })
        .catch(() => {
          guestStorageNoticeRef.current = false;
        });
    }
    setTab("calendar");
  };

  const setTestToday = (testToday?: string) => {
    if (!canUseDevTools) return;
    const normalized = testToday && /^\d{4}-\d{2}-\d{2}$/.test(testToday) ? testToday : undefined;
    setState((current) => reconcileLetters({ ...current, testToday: normalized }, normalized ? startOfDay(`${normalized}T00:00:00`) : startOfDay(new Date())));
  };

  const addSampleEntry = (entry: Omit<Entry, "id" | "createdAt">) => {
    if (!canUseDevTools) return;
    const sampleDate = state.testToday || dateKey(new Date());
    const createdAt = new Date(`${sampleDate}T09:30:00`).toISOString();
    const sampleEntry = { ...entry, id: createId(), createdAt };
    setCalendarFocusDate(sampleDate);
    setState((current) => reconcileLetters({
      ...current,
      entries: [sampleEntry, ...current.entries]
    }));
    if (user) {
      setSyncStatus("샘플 저장 중");
      setAuthError(null);
      upsertEntry(user.id, sampleEntry)
        .then(() => setSyncStatus("샘플 저장 완료"))
        .catch((error) => {
          console.warn("Supabase sample entry upsert failed", error);
          setSyncStatus("실패");
          setAuthError(getErrorMessage(error));
        });
    }
    setTab("calendar");
  };

  const addStoreSampleData = () => {
    if (!canUseDevTools) return;
    const sampleEntries = storeSampleEntries.map((entry) => ({ ...entry, id: createId() }));
    const sampleKeys = new Set(storeSampleEntries.flatMap((entry) => [
      `${entry.createdAt}|${entry.text}`,
      `${entry.createdAt}.000Z|${entry.text}`
    ]));
    setCalendarFocusDate("2026-05-31");
    setTab("calendar");
    setState((current) => {
      const existing = current.entries.filter((entry) => !sampleKeys.has(`${entry.createdAt}|${entry.text}`));
      return {
        ...reconcileLetters({
          ...current,
          testToday: "2026-06-14",
          theme: "green",
          energyColorMode: "soft",
          calendarEnergyMode: "last",
          letterPaperStyle: "clover",
          entries: [...sampleEntries, ...existing]
        }, startOfDay("2026-06-14T00:00:00")),
        letters: storeSampleLetters
      };
    });
    if (user) {
      setSyncStatus("스토어 샘플 저장 중");
      setAuthError(null);
      Promise.all(sampleEntries.map((entry) => upsertEntry(user.id, entry)))
        .then(() => setSyncStatus("스토어 샘플 저장 완료"))
        .catch((error) => {
          console.warn("Supabase store sample entry upsert failed", error);
          setSyncStatus("실패");
          setAuthError(getErrorMessage(error));
        });
    }
  };

  const handleProviderLogin = async (signIn: () => Promise<Session | null>) => {
    setAuthLoading(true);
    setAuthError(null);
    loginInProgressRef.current = true;
    try {
      const session = await signIn();
      if (session?.user) {
        setAuthChoiceVisible(false);
        const guestState = await loadAppState(null);
        const shouldImport = guestState.entries.length
          ? await confirmGuestEntryImport(guestState.entries.length)
          : false;

        if (shouldImport) {
          try {
            setSyncStatus("게스트 기록 가져오는 중");
            const accountState = await loadAppState(session.user.id);
            const mergedEntries = new Map(accountState.entries.map((entry) => [entry.id, entry]));
            guestState.entries.forEach((entry) => mergedEntries.set(entry.id, entry));
            const synced = await syncAppState(session.user, {
              ...accountState,
              entries: [...mergedEntries.values()]
            });
            await saveAppState(synced, session.user.id);
            await removeAppState(null);
            await activateLocalScope(session.user, false, synced);
            setSyncStatus(`게스트 기록 ${guestState.entries.length}개 가져오기 완료`);
          } catch (importError) {
            await activateLocalScope(session.user);
            setSyncStatus("게스트 기록 가져오기 실패");
            setAuthError(`로그인은 완료했지만 게스트 기록을 가져오지 못했어. 기기의 게스트 기록은 그대로 보관했어. · ${getErrorMessage(importError)}`);
          }
        } else {
          await activateLocalScope(session.user);
        }
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "로그인에 실패했어.");
    } finally {
      loginInProgressRef.current = false;
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = () => handleProviderLogin(signInWithGoogle);
  const handleAppleLogin = () => handleProviderLogin(signInWithApple);
  const handleKakaoLogin = () => handleProviderLogin(signInWithKakao);

  const handleSignOut = async () => {
    await signOut();
    await activateLocalScope(null);
  };

  const handleDeleteUserData = async () => {
    setSyncStatus("삭제 중");
    setAuthError(null);
    try {
      if (user) {
        await deleteRemoteUserData(user.id);
        await removeAppState(user.id);
      }
      await cancelLogNotifications();
      setNotificationStatus("예약 0개");
      setState(sanitizeStateForVariant(defaultState));
      setCalendarFocusDate(undefined);
      setTab("capture");
      setSyncStatus("삭제 완료");
    } catch (error) {
      console.warn("User data delete failed", error);
      setSyncStatus("실패");
      setAuthError(getErrorMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    setSyncStatus("계정 삭제 중");
    setAuthError(null);
    try {
      const userId = user?.id;
      await deleteAccount();
      if (userId) await removeAppState(userId);
      await cancelLogNotifications();
      setNotificationStatus("예약 0개");
      setState(sanitizeStateForVariant(defaultState));
      setCalendarFocusDate(undefined);
      await signOut();
      await activateLocalScope(null);
      setSyncStatus(null);
      setTab("capture");
    } catch (error) {
      console.warn("Account delete failed", error);
      setSyncStatus("실패");
      setAuthError(getErrorMessage(error));
    }
  };

  const setTargetMoods = (targetMoods: Mood[]) => {
    setState((current) => {
      const next = { ...current, targetMoods };
      if (user) upsertRemoteSettings(user.id, next).catch((error) => console.warn("Supabase target moods sync failed", error));
      return next;
    });
  };

  const saveMonthlyNote = (monthKey: string, note: string) => {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return;
    const normalizedNote = note.trim().slice(0, 2000);
    if (!normalizedNote) return;
    setState((current) => {
      const next = {
        ...current,
        monthlyNotes: { ...current.monthlyNotes, [monthKey]: normalizedNote }
      };
      if (user) upsertRemoteSettings(user.id, next).catch((error) => console.warn("Supabase monthly note sync failed", error));
      return next;
    });
  };

  const updateEntry = (entry: Entry) => {
    const previous = state.entries.find((item) => item.id === entry.id);
    if (!previous) return;

    setState((current) => ({
      ...current,
      entries: current.entries.map((item) => (item.id === entry.id ? entry : item))
    }));
    if (!user) return;

    setSyncStatus("기록 수정 중");
    setAuthError(null);
    upsertEntry(user.id, entry)
      .then(() => setSyncStatus("기록 수정 완료"))
      .catch((error) => {
        console.warn("Supabase update entry failed", error);
        setState((current) => ({
          ...current,
          entries: current.entries.map((item) => (item.id === previous.id ? previous : item))
        }));
        setSyncStatus("실패");
        setAuthError(getErrorMessage(error));
      });
  };

  const deleteEntries = (entryIds: string[]) => {
    const ids = new Set(entryIds);
    const deletedEntries = state.entries.filter((entry) => ids.has(entry.id));
    setState((current) => ({
      ...current,
      entries: current.entries.filter((entry) => !ids.has(entry.id))
    }));
    if (!user) return;

    setSyncStatus("기록 삭제 중");
    setAuthError(null);
    deleteRemoteEntries(user.id, entryIds)
      .then(() => setSyncStatus("기록 삭제 완료"))
      .catch((error) => {
        console.warn("Supabase delete entry failed", error);
        setState((current) => ({
          ...current,
          entries: [...current.entries, ...deletedEntries.filter((deleted) => !current.entries.some((entry) => entry.id === deleted.id))]
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        }));
        setSyncStatus("실패");
        setAuthError(getErrorMessage(error));
      });
  };

  const applyNotificationSettings = async (settings: AppState["settings"]) => {
    try {
      if (!settings.enabled) {
        await cancelLogNotifications();
        setNotificationStatus("꺼짐");
        return { status: "꺼짐", count: 0 };
      }
      const result = await scheduleLogNotifications(settings);
      const countLabel = settings.scheduleMode === "fixed"
        ? `일주일 ${result.count}번의 기록을 할 수 있어`
        : `하루 ${result.count}번의 기록을 할 수 있어`;
      setNotificationStatus(result.count ? countLabel : result.status);
      return result;
    } catch (error) {
      console.warn("Notification scheduling failed", error);
      const status = error instanceof Error ? error.message : "예약 실패";
      setNotificationStatus(status);
      return { status, count: 0 };
    }
  };

  const refreshNotificationDebug = async () => {
    const [permission, count] = await Promise.all([
      getNotificationPermissionStatus(),
      getScheduledLogNotificationCount()
    ]);
    const status = `${permission} · 예약 ${count}개`;
    setNotificationStatus(status);
    return status;
  };

  const sendTestNotification = async () => {
    const result = await scheduleTestLogNotification();
    setNotificationStatus(result);
    return result;
  };

  const cancelScheduledNotifications = async () => {
    await cancelLogNotifications();
    setNotificationStatus("예약 0개");
    return "예약된 기록 알림을 모두 취소했어.";
  };

  useEffect(() => {
    getNotificationPermissionStatus()
      .then(setNotificationStatus)
      .catch(() => setNotificationStatus("확인 실패"));
  }, []);

  useEffect(() => {
    if (!hydrated || !state.settings.enabled) return;
    applyNotificationSettings(state.settings);
  }, [hydrated]);

  const content = {
    universe: (
      <UniverseScreen
        entries={user ? state.entries : []}
        guestEntryCount={user ? 0 : state.entries.length}
        isLoggedIn={Boolean(user)}
        loginLoading={authLoading}
        onLogin={() => setAuthChoiceVisible(true)}
      />
    ),
    capture: <CaptureScreen onAddEntry={addEntry} getNow={() => nowForState(state)} energyColorMode={state.energyColorMode} />,
    calendar: (
      <CalendarScreen
        entries={state.entries}
        energyColorMode={state.energyColorMode}
        calendarMode={state.calendarEnergyMode}
        targetMoods={state.targetMoods}
        monthlyNotes={state.monthlyNotes}
        focusDate={calendarFocusDate}
        onUpdateEntry={updateEntry}
        onDeleteEntries={deleteEntries}
        onSaveMonthlyNote={saveMonthlyNote}
      />
    ),
    inbox: (
      <InboxScreen
        entries={state.entries}
        letters={letters}
        letterPaperStyle={state.letterPaperStyle}
        onSavePostscript={(letterId, postscript) => {
          setState((current) => ({
            ...current,
            letters: letters.map((letter) => (letter.id === letterId ? { ...letter, postscript } : letter))
          }));
          if (user) {
            const next = {
              ...state,
              letters: state.letters.map((letter) => (letter.id === letterId ? { ...letter, postscript } : letter))
            };
            upsertRemoteSettings(user.id, next).catch((error) => console.warn("Supabase postscript sync failed", error));
          }
        }}
      />
    ),
    collection: (
      <CalendarScreen
        entries={state.entries}
        energyColorMode={state.energyColorMode}
        calendarMode={state.calendarEnergyMode}
        targetMoods={state.targetMoods}
        monthlyNotes={state.monthlyNotes}
        onUpdateEntry={updateEntry}
        onDeleteEntries={deleteEntries}
        onSaveMonthlyNote={saveMonthlyNote}
        analysisOnly
      />
    ),
    settings: (
      <SettingsScreen
        settings={state.settings}
        onChange={(settings) => setState((current) => {
          return { ...current, settings };
        })}
        onSave={async (settings) => {
          const result = await applyNotificationSettings(settings);
          if (settings.enabled && !result.count) {
            const disabledSettings = { ...settings, enabled: false };
            setState((current) => ({ ...current, settings: disabledSettings }));
            if (user) {
              await upsertRemoteSettings(user.id, { ...state, settings: disabledSettings });
            }
            throw new Error(result.status === "권한 차단됨"
              ? "알림 권한이 차단되어 있어. 기기 설정에서 허용해줘."
              : "알림 권한을 허용해야 예약할 수 있어.");
          }
          const next = { ...state, settings };
          if (user) {
            await upsertRemoteSettings(user.id, next);
          }
        }}
      />
    ),
    account: (
      <AccountScreen
        user={user}
        loading={authLoading}
        error={authError}
        syncStatus={syncStatus}
        onAppleLogin={handleAppleLogin}
        onGoogleLogin={handleGoogleLogin}
        onKakaoLogin={handleKakaoLogin}
        onSync={() => runFullSync()}
        onDeleteData={handleDeleteUserData}
        onDeleteAccount={handleDeleteAccount}
        onSignOut={handleSignOut}
      />
    ),
    appSettings: (
      <AppSettingsScreen
        targetMoods={state.targetMoods}
        letterPaperStyle={state.letterPaperStyle}
        letterArchiveEnabled={LETTER_ARCHIVE_ENABLED}
        onChangeTargetMoods={setTargetMoods}
        onChangeLetterPaperStyle={(letterPaperStyle) => setState((current) => {
          const next = { ...current, letterPaperStyle };
          if (user) upsertRemoteSettings(user.id, next).catch((error) => console.warn("Supabase letter paper sync failed", error));
          return next;
        })}
      />
    ),
    guide: <GuideScreen />,
    dev: (
      <DevConsoleScreen
        testToday={state.testToday}
        notificationStatus={notificationStatus}
        onChangeTestToday={setTestToday}
        onAddSampleEntry={addSampleEntry}
        onAddStoreSampleData={addStoreSampleData}
        onRefreshNotifications={refreshNotificationDebug}
        onSendTestNotification={sendTestNotification}
        onCancelNotifications={cancelScheduledNotifications}
      />
    )
  }[activeTab];

  return (
    <SafeAreaProvider>
      <AppThemeProvider theme={theme}>
        <View style={styles.safe}>
        <SpaceBackdrop />
        <StatusBar style="light" />
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.border,
              backgroundColor: "rgba(7, 13, 42, 0.84)"
            }
          ]}
        >
          <View style={styles.pageHeading}>
            <Text style={styles.pageEyebrow}>{activeHeader.eyebrow}</Text>
            <Text style={[styles.pageTitle, { color: theme.text }]}>{activeHeader.title}</Text>
            <Text style={[styles.pageLead, { color: theme.muted }]}>{activeHeader.lead}</Text>
          </View>
          <Pressable
            style={[styles.menuButton, { backgroundColor: theme.soft }]}
            onPress={() => setMenuOpen((current) => !current)}
          >
            <Text style={[styles.menuButtonText, { color: theme.text }]}>{menuOpen ? "×" : "☰"}</Text>
          </Pressable>
        </View>
        {menuOpen ? (
          <>
            <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
            <View style={[styles.floatingMenu, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={[styles.floatingMenuHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                <Text style={[styles.floatingMenuTitle, { color: theme.text }]}>메뉴</Text>
                <Pressable style={styles.closeButton} onPress={() => setMenuOpen(false)}>
                  <Text style={[styles.closeButtonText, { color: theme.muted }]}>×</Text>
                </Pressable>
              </View>
              <AuthCard
                user={user}
                loading={authLoading}
                error={authError}
                onAppleLogin={handleAppleLogin}
                onGoogleLogin={handleGoogleLogin}
                onKakaoLogin={handleKakaoLogin}
              />
              <Pressable
                style={[styles.menuListItem, { borderTopColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => {
                  setTab("account");
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuListIcon}>👤</Text>
                <Text style={[styles.menuListText, { color: theme.text }]}>계정</Text>
              </Pressable>
              <Pressable
                style={[styles.menuListItem, { borderTopColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => {
                  setTab("appSettings");
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuListIcon}>⚙️</Text>
                <Text style={[styles.menuListText, { color: theme.text }]}>설정</Text>
              </Pressable>
              <Pressable
                style={[styles.menuListItem, { borderTopColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => {
                  setTab("guide");
                  setMenuOpen(false);
                }}
              >
                <Text style={styles.menuListIcon}>📗</Text>
                <Text style={[styles.menuListText, { color: theme.text }]}>가이드</Text>
              </Pressable>
              {canUseDevTools ? (
                <Pressable
                  style={[styles.menuListItem, { borderTopColor: theme.border, backgroundColor: theme.card }]}
                  onPress={() => {
                    setTab("dev");
                    setMenuOpen(false);
                  }}
                >
                  <Text style={styles.menuListIcon}>🧪</Text>
                  <Text style={[styles.menuListText, { color: theme.text }]}>테스트</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
        <View style={styles.body}>{content}</View>
        <BottomTabs active={activeTab} onChange={setTab} cosmic />
        <FirstRunGuideModal visible={firstRunGuideVisible} onClose={dismissFirstRunGuide} />
        <Modal
          transparent
          animationType="fade"
          visible={guestBrowsePromptVisible}
          onRequestClose={() => setGuestBrowsePromptVisible(false)}
        >
          <View style={styles.guestBrowseModalBackdrop}>
            <View style={styles.guestBrowseModal}>
              <Text style={styles.guestBrowseModalTitle}>나만의 기록 행성을 만들어봐</Text>
              <Pressable
                disabled={authLoading}
                style={[styles.guestBrowsePrimaryButton, authLoading && styles.guestBrowseButtonDisabled]}
                onPress={() => {
                  setGuestBrowsePromptVisible(false);
                  setAuthChoiceVisible(true);
                }}
              >
                <Text style={styles.guestBrowsePrimaryText}>{authLoading ? "로그인 중" : "로그인 하러 가기"}</Text>
              </Pressable>
              <Pressable
                style={styles.guestBrowseSecondaryButton}
                onPress={() => setGuestBrowsePromptVisible(false)}
              >
                <Text style={styles.guestBrowseSecondaryText}>로그인 없이 둘러보기</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          transparent
          animationType="fade"
          visible={authChoiceVisible && !user}
          onRequestClose={() => setAuthChoiceVisible(false)}
        >
          <Pressable style={styles.authChoiceBackdrop} onPress={() => setAuthChoiceVisible(false)}>
            <Pressable style={styles.authChoiceModal} onPress={(event) => event.stopPropagation()}>
              <View style={styles.authChoiceHeader}>
                <Text style={styles.authChoiceTitle}>로그인 방법 선택</Text>
                <Pressable style={styles.authChoiceClose} onPress={() => setAuthChoiceVisible(false)}>
                  <Text style={styles.authChoiceCloseText}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.authChoiceDescription}>계정을 연결하면 기록을 안전하게 보관하고 행성으로 불러올 수 있어.</Text>
              {authError ? <Text style={styles.authChoiceError}>{authError}</Text> : null}
              <AppleLoginButton loading={authLoading} onPress={handleAppleLogin} />
              <KakaoLoginButton loading={authLoading} onPress={handleKakaoLogin} />
              <GoogleLoginButton loading={authLoading} onPress={handleGoogleLogin} />
            </Pressable>
          </Pressable>
        </Modal>
        </View>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#070d2a"
  },
  guestBrowseModalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(3, 7, 24, 0.72)"
  },
  guestBrowseModal: {
    width: "100%",
    maxWidth: 340,
    gap: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.34)",
    borderRadius: 8,
    backgroundColor: "#0b1b4d"
  },
  guestBrowseModalTitle: {
    marginBottom: 6,
    color: "#fff",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  guestBrowsePrimaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#c9e6ff"
  },
  guestBrowsePrimaryText: {
    color: "#0b1b4d",
    fontSize: 14,
    fontWeight: "900"
  },
  guestBrowseSecondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.3)",
    borderRadius: 8
  },
  guestBrowseSecondaryText: {
    color: "#d8ebff",
    fontSize: 14,
    fontWeight: "900"
  },
  guestBrowseButtonDisabled: {
    opacity: 0.5
  },
  authChoiceBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(3, 7, 24, 0.76)"
  },
  authChoiceModal: {
    width: "100%",
    maxWidth: 340,
    gap: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(191, 224, 255, 0.34)",
    borderRadius: 8,
    backgroundColor: "#0b1b4d"
  },
  authChoiceHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  authChoiceTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900"
  },
  authChoiceClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  authChoiceCloseText: {
    color: "#d8ebff",
    fontSize: 24,
    fontWeight: "900"
  },
  authChoiceDescription: {
    color: "rgba(216, 235, 255, 0.78)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  authChoiceError: {
    color: "#ffb4ab",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: topSafePadding + 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe8da",
    backgroundColor: "rgba(7, 13, 42, 0.84)"
  },
  pageHeading: {
    flex: 1,
    gap: 2,
    paddingRight: 12
  },
  pageEyebrow: {
    color: "#9fcfff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "900"
  },
  pageLead: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  menuButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    borderRadius: 8
  },
  menuButtonText: {
    fontSize: 22,
    fontWeight: "900"
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: "rgba(3, 7, 24, 0.42)"
  },
  floatingMenu: {
    position: "absolute",
    top: topSafePadding + 80,
    right: 14,
    zIndex: 20,
    width: 292,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#18241b",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  floatingMenuHeader: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 14,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dfe8da",
    backgroundColor: "#fff"
  },
  floatingMenuTitle: {
    color: "#18241b",
    fontSize: 15,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8
  },
  closeButtonText: {
    color: "#657064",
    fontSize: 24,
    fontWeight: "900"
  },
  menuListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#dfe8da",
    backgroundColor: "#fff"
  },
  menuListIcon: {
    fontSize: 17
  },
  menuListText: {
    flex: 1,
    color: "#18241b",
    fontSize: 15,
    fontWeight: "900"
  },
  body: {
    flex: 1
  }
});
