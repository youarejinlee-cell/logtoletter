const STORAGE_KEY = "thought-letter-mvp-v1";
const LETTER_VERSION = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const SUPABASE_CONFIG = window.LOG_TO_LETTER_SUPABASE || {};

const moods = [
  { key: "calm", label: "😌 차분함", category: "positive" },
  { key: "joy", label: "😊 좋음", category: "positive" },
  { key: "moved", label: "🥹 뭉클함", category: "positive" },
  { key: "recovered", label: "🌱 회복됨", category: "positive" },
  { key: "proud", label: "✨ 뿌듯함", category: "positive" },
  { key: "grateful", label: "🙏 고마움", category: "positive" },
  { key: "peaceful", label: "🕊️ 평화로움", category: "positive" },
  { key: "lucky", label: "🍀 행운", category: "positive" },
  { key: "happy", label: "😄 행복함", category: "positive" },
  { key: "delight", label: "😁 기쁨", category: "positive" },
  { key: "excited", label: "💓 설렘", category: "positive" },
  { key: "fun", label: "😆 재밌음", category: "positive" },
  { key: "selfEsteem", label: "💪 자존감상승", category: "positive" },
  { key: "anxious", label: "😟 불안함", category: "negative" },
  { key: "tired", label: "😮‍💨 피곤함", category: "negative" },
  { key: "sad", label: "😔 가라앉음", category: "negative" },
  { key: "depressed", label: "🌧️ 우울함", category: "negative" },
  { key: "angry", label: "😤 날카로움", category: "negative" },
  { key: "complex", label: "🤔 복잡함", category: "negative" },
  { key: "blank", label: "🫠 멍함", category: "negative" },
  { key: "irritated", label: "😒 짜증남", category: "negative" },
  { key: "jealous", label: "🫣 질투", category: "negative" },
  { key: "prideHurt", label: "😣 자존심상함", category: "negative" },
  { key: "sensitive", label: "🌶️ 예민함", category: "negative" },
];

const moodLabels = Object.fromEntries(moods.map((mood) => [mood.key, mood.label]));

const energyLevels = [
  { value: 1, color: "gray", label: "회색" },
  { value: 2, color: "red", label: "빨강" },
  { value: 3, color: "yellow", label: "노랑" },
  { value: 4, color: "green", label: "초록" },
  { value: 5, color: "blue", label: "파랑" },
];

const defaultState = {
  settings: {
    startTime: "09:30",
    dndStart: "22:30",
    dndEnd: "08:00",
    intervalMinutes: 120,
    enabled: false,
    notificationsEnabled: false,
  },
  testOverrides: {
    notification: "actual",
    microphone: "actual",
  },
  entries: [],
  letter: null,
  letters: [],
  letterSettings: {
    firstUsedAt: null,
    deliveryWeekday: null,
  },
};

let state = loadState();
let promptTimer = null;
let calendarCursor = new Date();
let selectedDateKey = getDateKey(new Date());
let calendarViewMode = "date";
let calendarRecentDays = 7;
let calendarEnergyMode = "first";
let recentSortKey = "date";
let recentSortDirection = "desc";
let selectedLetterOffset = 0;
let activeLetter = null;
let speechRecognition = null;
let speechListeningButton = null;
let speechListeningTarget = null;
let speechListeningStatus = null;
let speechBaseText = "";
let speechFinalText = "";
let toastTimer = null;
let supabaseClient = null;
let authSession = null;
let authUser = null;
let cloudReady = false;
let cloudSyncTimer = null;
let isHydratingCloud = false;
const expandedMoods = {
  positive: false,
  negative: false,
};

const $ = (selector) => document.querySelector(selector);
const nextPrompt = $("#nextPrompt");
const permissionStatus = $("#permissionStatus");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const merged = {
      ...defaultState,
      ...saved,
      settings: { ...defaultState.settings, ...(saved.settings || {}) },
      testOverrides: { ...defaultState.testOverrides, ...(saved.testOverrides || {}) },
      letterSettings: { ...defaultState.letterSettings, ...(saved.letterSettings || {}) },
    };
    return hydrateLetterState(merged);
  } catch {
    return hydrateLetterState(structuredClone(defaultState));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueCloudSync();
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}

function initSupabaseClient() {
  if (!isSupabaseConfigured() || !window.supabase?.createClient) return null;
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return supabaseClient;
}

function setAuthSession(session) {
  authSession = session || null;
  authUser = authSession?.user || null;
  cloudReady = Boolean(supabaseClient && authUser);
}

function getMoodCategory(mood) {
  return moods.find((item) => item.key === mood)?.category || null;
}

function getProfileRow() {
  if (!authUser) return null;
  return {
    user_id: authUser.id,
    email: authUser.email || null,
    display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
    first_used_at: state.letterSettings.firstUsedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function getNotificationSettingsRow() {
  if (!authUser) return null;
  return {
    user_id: authUser.id,
    enabled: Boolean(state.settings.enabled),
    notifications_enabled: Boolean(state.settings.notificationsEnabled),
    start_time: state.settings.startTime,
    interval_minutes: Number(state.settings.intervalMinutes),
    dnd_start: state.settings.dndStart,
    dnd_end: state.settings.dndEnd,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    updated_at: new Date().toISOString(),
  };
}

function getAppSettingsRow() {
  if (!authUser) return null;
  return {
    user_id: authUser.id,
    letter_settings: state.letterSettings,
    test_overrides: state.testOverrides,
    preferences: {},
    updated_at: new Date().toISOString(),
  };
}

function entryToRow(entry) {
  return {
    id: entry.id,
    user_id: authUser.id,
    text: entry.text,
    mood: entry.mood,
    mood_category: getMoodCategory(entry.mood),
    energy: Number(entry.energy),
    source: entry.source || "web",
    created_at: entry.createdAt,
    demo_tag: entry.demoTag || null,
    updated_at: new Date().toISOString(),
  };
}

function rowToEntry(row) {
  return {
    id: row.id,
    text: row.text,
    mood: row.mood,
    energy: Number(row.energy),
    createdAt: row.created_at,
    ...(row.source ? { source: row.source } : {}),
    ...(row.demo_tag ? { demoTag: row.demo_tag } : {}),
  };
}

function letterToRow(letter) {
  const temp = document.createElement("div");
  temp.innerHTML = letter.html || "";
  return {
    user_id: authUser.id,
    id: letter.id,
    title: letter.title || "지난 주의 편지",
    body: temp.textContent.trim() || letter.title || "지난 주의 편지",
    html: letter.html || "",
    period_start: getDateKey(letter.periodStart || letter.createdAt || new Date()),
    period_end: getDateKey(letter.periodEnd || letter.deliveredAt || letter.createdAt || new Date()),
    delivered_at: getDateKey(letter.deliveredAt || letter.createdAt || new Date()),
    summary_json: { periodLabel: letter.periodLabel || "", entryCount: letter.entryCount || null },
    themes: letter.themes || [],
    recommendations: letter.recommendations || [],
    postscript: letter.postscript || "",
    model: null,
    prompt_version: `rules-v${LETTER_VERSION}`,
    version: letter.version || LETTER_VERSION,
    created_at: letter.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function rowToLetter(row) {
  return {
    id: row.id,
    title: row.title,
    html: row.html,
    periodLabel: row.summary_json?.periodLabel || `${row.period_start} ~ ${row.period_end}`,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    deliveredAt: row.delivered_at,
    themes: row.themes || [],
    recommendations: row.recommendations || [],
    postscript: row.postscript || "",
    version: row.version,
    createdAt: row.created_at,
  };
}

function saveLocalOnly(nextState = state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function queueCloudSync() {
  if (!cloudReady || isHydratingCloud) return;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(() => {
    persistCloudSnapshot().catch((error) => {
      console.warn("Supabase sync failed", error);
      renderAuth();
    });
  }, 600);
}

async function persistCloudSnapshot() {
  if (!cloudReady || !authUser) return;
  const profile = getProfileRow();
  const notificationSettings = getNotificationSettingsRow();
  const appSettings = getAppSettingsRow();
  const setupResults = await Promise.all([
    supabaseClient.from("profiles").upsert(profile, { onConflict: "user_id" }),
    supabaseClient.from("notification_settings").upsert(notificationSettings, { onConflict: "user_id" }),
    supabaseClient.from("app_settings").upsert(appSettings, { onConflict: "user_id" }),
  ]);
  const setupError = setupResults.find((result) => result.error)?.error;
  if (setupError) throw setupError;

  if (state.entries.length) {
    const { error } = await supabaseClient.from("entries").upsert(state.entries.map(entryToRow), { onConflict: "id" });
    if (error) throw error;
  }

  if (state.letters.length) {
    await persistLetterPeriods(state.letters);
    const { error } = await supabaseClient.from("letters").upsert(state.letters.map(letterToRow), { onConflict: "user_id,id" });
    if (error) throw error;
  }
}

async function persistLetterPeriods(letters) {
  if (!letters.length) return;
  const rows = letters.map((letter) => ({
    user_id: authUser.id,
    input_start_date: getDateKey(letter.periodStart || letter.createdAt || new Date()),
    input_end_date: getDateKey(letter.periodEnd || letter.deliveredAt || letter.createdAt || new Date()),
    send_date: getDateKey(letter.deliveredAt || letter.createdAt || new Date()),
    status: "delivered",
  }));
  const { error } = await supabaseClient.from("letter_periods").upsert(rows, { onConflict: "user_id,send_date" });
  if (error) throw error;
}

async function deleteCloudEntry(id) {
  if (!cloudReady) return;
  const { error } = await supabaseClient.from("entries").delete().eq("id", id);
  if (error) console.warn("Supabase delete entry failed", error);
}

async function clearCloudJournalData() {
  if (!cloudReady || !authUser) return;
  const [entryResult, letterResult, periodResult] = await Promise.all([
    supabaseClient.from("entries").delete().eq("user_id", authUser.id),
    supabaseClient.from("letters").delete().eq("user_id", authUser.id),
    supabaseClient.from("letter_periods").delete().eq("user_id", authUser.id),
  ]);
  if (entryResult.error) console.warn("Supabase clear entries failed", entryResult.error);
  if (letterResult.error) console.warn("Supabase clear letters failed", letterResult.error);
  if (periodResult.error) console.warn("Supabase clear letter periods failed", periodResult.error);
}

async function loadCloudState() {
  if (!cloudReady || !authUser) return;
  isHydratingCloud = true;
  try {
    const [
      { data: profile, error: profileError },
      { data: notificationSettings, error: notificationError },
      { data: appSettings, error: settingsError },
      { data: remoteEntries, error: entriesError },
      { data: remoteLetters, error: lettersError },
    ] =
      await Promise.all([
        supabaseClient.from("profiles").select("*").eq("user_id", authUser.id).maybeSingle(),
        supabaseClient.from("notification_settings").select("*").eq("user_id", authUser.id).maybeSingle(),
        supabaseClient.from("app_settings").select("*").eq("user_id", authUser.id).maybeSingle(),
        supabaseClient.from("entries").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }),
        supabaseClient.from("letters").select("*").eq("user_id", authUser.id).order("delivered_at", { ascending: false }),
      ]);

    if (profileError) throw profileError;
    if (notificationError) throw notificationError;
    if (settingsError) throw settingsError;
    if (entriesError) throw entriesError;
    if (lettersError) throw lettersError;

    const hasRemoteJournal = Boolean(remoteEntries?.length || remoteLetters?.length);
    const hasLocalJournal = Boolean(state.entries.length || state.letters.length);
    if (!hasRemoteJournal && hasLocalJournal) {
      await persistCloudSnapshot();
      showToast("이 기기의 기록을 계정에 연결했어");
      return;
    }

    state = hydrateLetterState({
      ...structuredClone(defaultState),
      settings: {
        ...defaultState.settings,
        ...state.settings,
        ...(notificationSettings
          ? {
              startTime: notificationSettings.start_time,
              dndStart: notificationSettings.dnd_start,
              dndEnd: notificationSettings.dnd_end,
              intervalMinutes: notificationSettings.interval_minutes,
              enabled: notificationSettings.enabled,
              notificationsEnabled: notificationSettings.notifications_enabled,
            }
          : {}),
      },
      testOverrides: { ...defaultState.testOverrides, ...(appSettings?.test_overrides || state.testOverrides || {}) },
      letterSettings: {
        ...defaultState.letterSettings,
        ...(appSettings?.letter_settings || state.letterSettings || {}),
        ...(profile?.first_used_at ? { firstUsedAt: profile.first_used_at } : {}),
      },
      entries: (remoteEntries || []).map(rowToEntry),
      letters: (remoteLetters || []).map(rowToLetter),
    });
    state.letter = state.letters[0] || null;
    saveLocalOnly();
    selectedDateKey = getDateKey(new Date());
  } finally {
    isHydratingCloud = false;
  }
}

function renderAuth() {
  const card = $("#authCard");
  if (!card) return;
  const title = $("#authStatusTitle");
  const text = $("#authStatusText");
  const form = $("#authForm");
  const signOutButton = $("#signOutButton");
  const submitButton = $("#authSubmitButton");
  const googleButton = $("#googleLoginButton");
  const setAuthButtonsDisabled = (disabled) => {
    submitButton.disabled = disabled;
    googleButton.disabled = disabled;
  };

  if (!isSupabaseConfigured()) {
    title.textContent = "Supabase 연결 전";
    text.textContent = "supabase-config.js에 URL과 anon key를 넣어줘.";
    form.hidden = false;
    setAuthButtonsDisabled(true);
    signOutButton.hidden = true;
    return;
  }

  if (!window.supabase?.createClient) {
    title.textContent = "로그인 준비 중";
    text.textContent = "Supabase 라이브러리를 불러오는 중이야.";
    form.hidden = false;
    setAuthButtonsDisabled(true);
    signOutButton.hidden = true;
    return;
  }

  setAuthButtonsDisabled(false);
  if (authUser) {
    title.textContent = "로그인됨";
    text.textContent = authUser.email || "계정이 연결됐어.";
    form.hidden = true;
    signOutButton.hidden = false;
  } else {
    title.textContent = "계정 연결";
    text.textContent = "이메일로 로그인 링크를 받을 수 있어.";
    form.hidden = false;
    signOutButton.hidden = true;
  }
}

async function initAuth() {
  initSupabaseClient();
  renderAuth();
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.warn("Supabase session failed", error);
    renderAuth();
    return;
  }
  setAuthSession(data.session);
  if (authUser) {
    await loadCloudState();
    render();
  }
  renderAuth();

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    setAuthSession(session);
    if (authUser) {
      await loadCloudState();
      showToast("계정이 연결됐어");
    }
    render();
    renderAuth();
  });
}

async function sendLoginLink(email) {
  if (!supabaseClient || !email) return;
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    showToast("로그인 링크 전송 실패");
    console.warn("Supabase login failed", error);
    return;
  }
  showToast("로그인 링크를 보냈어");
}

async function signInWithGoogle() {
  if (!supabaseClient) return;
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) {
    showToast("Google 로그인 실패");
    console.warn("Supabase OAuth failed", error);
  }
}

async function signOut() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast("로그아웃 실패");
    console.warn("Supabase sign out failed", error);
    return;
  }
  setAuthSession(null);
  renderAuth();
  showToast("로그아웃했어");
}

function hydrateLetterState(nextState) {
  const entries = nextState.entries || [];
  const earliestEntry = entries
    .map((entry) => new Date(entry.createdAt).getTime())
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  const savedFirstUsed = nextState.letterSettings.firstUsedAt ? new Date(nextState.letterSettings.firstUsedAt).getTime() : null;
  const firstUsedAt = new Date(Math.min(...[savedFirstUsed, earliestEntry, Date.now()].filter(Boolean))).toISOString();
  const firstDelivery = new Date(new Date(firstUsedAt).getTime() + 7 * DAY_MS);
  nextState.letterSettings = {
    firstUsedAt,
    deliveryWeekday:
      nextState.letterSettings.deliveryWeekday === null || nextState.letterSettings.deliveryWeekday === undefined
        ? firstDelivery.getDay()
        : Number(nextState.letterSettings.deliveryWeekday),
  };
  nextState.letters = Array.isArray(nextState.letters) ? nextState.letters : [];
  return nextState;
}

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getTestPermission(kind) {
  return state.testOverrides?.[kind] || "actual";
}

function formatPermissionState(value, actualLabel) {
  if (value === "actual") return actualLabel;
  if (value === "granted") return "허용됨(가정)";
  if (value === "denied") return "차단됨(가정)";
  return actualLabel;
}

function getMoodLabel(mood) {
  return moodLabels[mood] || moodLabels.calm;
}

function getMoodEmoji(mood) {
  return getMoodLabel(mood).split(" ")[0];
}

function getEnergyLevel(energy) {
  const value = Math.min(5, Math.max(1, Math.round(Number(energy) || 3)));
  return energyLevels.find((level) => level.value === value) || energyLevels[2];
}

function getEnergyEmoji(energy) {
  return getEnergyLevel(energy).label;
}

function getAverageEnergy(entries) {
  if (!entries.length) return 0;
  return entries.reduce((total, entry) => total + Number(entry.energy || 3), 0) / entries.length;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesFromTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isQuietTime(date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  const start = minutesFromTime(state.settings.dndStart);
  const end = minutesFromTime(state.settings.dndEnd);
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function getNextPromptDate(from = new Date()) {
  const next = new Date(from);
  const startMinutes = minutesFromTime(state.settings.startTime);
  const interval = state.settings.intervalMinutes;
  next.setSeconds(0, 0);

  const todayStart = new Date(from);
  todayStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

  if (from < todayStart) {
    next.setTime(todayStart.getTime());
  } else {
    const elapsed = Math.ceil((from - todayStart) / 60000);
    const slots = Math.max(1, Math.ceil(elapsed / interval));
    next.setTime(todayStart.getTime() + slots * interval * 60000);
  }

  while (isQuietTime(next)) {
    next.setMinutes(next.getMinutes() + 15);
  }

  return next;
}

function updateNextPrompt() {
  if (!state.settings.enabled) {
    nextPrompt.textContent = "알림 꺼짐";
    return;
  }
  nextPrompt.textContent = formatDateTime(getNextPromptDate());
}

function getPermissionLabel() {
  const labels = {
    default: "아직 묻지 않음",
    granted: "허용됨",
    denied: "차단됨",
  };
  if (getTestPermission("notification") !== "actual") {
    return formatPermissionState(getTestPermission("notification"), "확인 전");
  }
  if (!("Notification" in window)) return "미지원";
  const actual = labels[Notification.permission] || Notification.permission;
  return formatPermissionState(getTestPermission("notification"), actual);
}

async function getMicrophonePermissionLabel() {
  const labels = {
    prompt: "아직 묻지 않음",
    granted: "허용됨",
    denied: "차단됨",
  };
  if (getTestPermission("microphone") !== "actual") {
    return formatPermissionState(getTestPermission("microphone"), "확인 전");
  }
  if (!navigator.mediaDevices?.getUserMedia && !getSpeechRecognitionConstructor()) return "미지원";
  if (!navigator.permissions?.query) return "확인 불가";
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    return labels[status.state] || status.state;
  } catch {
    return "확인 불가";
  }
}

function writeTestLog(message) {
  $("#notificationTestLog").textContent = message;
}

function startPromptLoop() {
  if (promptTimer) window.clearTimeout(promptTimer);
  updateNextPrompt();
  if (!state.settings.enabled) return;

  const next = getNextPromptDate();
  const wait = Math.max(1000, next.getTime() - Date.now());
  promptTimer = window.setTimeout(() => {
    if (state.settings.enabled && !isQuietTime()) showPrompt();
    startPromptLoop();
    updateNextPrompt();
  }, wait);
}

function showPrompt() {
  if ("Notification" in window && Notification.permission === "granted" && state.settings.notificationsEnabled) {
    const note = new Notification("무슨 생각하고 있어?", {
      body: "한 문장만 남겨도 미래의 나한테 전해줄 수 있어.",
    });
    note.onclick = () => {
      window.focus();
      openDialog();
    };
  }
  openDialog();
}

function sendBrowserNotification(title = "무슨 생각하고 있어?", body = "테스트 알림이야.") {
  if (getTestPermission("notification") === "granted" && (!("Notification" in window) || Notification.permission !== "granted")) {
    writeTestLog("알림 권한이 허용된 걸로 치고 앱 안 팝업을 열었어. 실제 푸시는 기기 권한이 필요해.");
    openDialog();
    return true;
  }
  if (getTestPermission("notification") === "denied") {
    writeTestLog("알림 권한이 차단된 걸로 치고 테스트했어. 권한 요청이 필요한 상태야.");
    return false;
  }
  if (!("Notification" in window)) {
    writeTestLog("이 브라우저에서는 알림을 지원하지 않아.");
    return false;
  }
  if (Notification.permission !== "granted") {
    writeTestLog("기기/브라우저 알림 권한이 아직 허용되지 않았어. 권한 물어보기를 먼저 눌러줘.");
    return false;
  }
  const note = new Notification(title, { body });
  note.onclick = () => {
    window.focus();
    openDialog();
  };
  return true;
}

function openDialog() {
  $("#dialogThoughtInput").value = "";
  $("#promptDialog").showModal();
}

function addEntry(text, mood = "calm", energy = 3) {
  const createdAt = new Date();
  const entry = {
    id: crypto.randomUUID(),
    text: text.trim(),
    mood,
    energy: Number(energy),
    createdAt: createdAt.toISOString(),
  };
  state.entries.unshift(entry);
  state.letter = null;
  selectedDateKey = getDateKey(createdAt);
  calendarCursor = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
  saveState();
  render();
}

function renderEntryList(container, entries, emptyText) {
  if (!entries.length) {
    container.innerHTML = `<div class="entry-item"><div><div class="entry-meta">기록 없음</div><p>${emptyText}</p></div></div>`;
    return;
  }

  container.innerHTML = entries
    .map(
      (entry) => `
        <article class="entry-item" data-mood="${entry.mood}">
          <div>
            <div class="entry-meta">
              <span>${getDateKey(entry.createdAt)} ${formatTime(entry.createdAt)}</span>
              <span class="mood-chip">${getMoodLabel(entry.mood)}</span>
              <span><span class="energy-dot energy-${getEnergyLevel(entry.energy).color}" aria-hidden="true"></span> 에너지 ${entry.energy}/5</span>
            </div>
            <p>${escapeHtml(entry.text)}</p>
          </div>
          <button class="text-button" data-delete="${entry.id}" type="button">삭제</button>
        </article>
      `
    )
    .join("");
}

function renderCalendarSummary(entries) {
  const analysis = analyzeEntries(entries);
  $("#calendarSummaryStrip").innerHTML = `
    <div class="summary-item">
      <span>기록</span>
      <strong>${analysis.entryCount}개</strong>
    </div>
    <div class="summary-item">
      <span>자주 보인 감정</span>
      <strong>${analysis.entryCount ? getMoodLabel(analysis.dominantMood) : "아직 없음"}</strong>
    </div>
    <div class="summary-item">
      <span>평균 에너지</span>
      <strong>${analysis.entryCount ? `${analysis.averageEnergy}/5` : "-"}</strong>
    </div>
    <div class="summary-item">
      <span>기록한 날</span>
      <strong>${analysis.activeDays}일</strong>
    </div>
  `;
}

function sortRecentEntries(entries) {
  const direction = recentSortDirection === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    if (recentSortKey === "energy") {
      const energyDiff = (Number(a.energy) - Number(b.energy)) * direction;
      if (energyDiff !== 0) return energyDiff;
    }
    return (new Date(a.createdAt) - new Date(b.createdAt)) * direction;
  });
}

function renderCalendar() {
  const grid = $("#calendarGrid");
  const list = $("#calendarEntriesList");
  const isRecentView = calendarViewMode === "recent";
  $("#calendarEnergyModeField").hidden = isRecentView;
  $("#calendarRangeField").hidden = !isRecentView;
  $("#recentSortControls").hidden = !isRecentView;
  $(".calendar-panel").hidden = isRecentView;
  $("#recentSortSelect").value = recentSortKey;
  document.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.calendarView === calendarViewMode);
  });
  document.querySelectorAll("[data-calendar-range]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.calendarRange) === calendarRecentDays);
  });
  document.querySelectorAll("[data-calendar-energy-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.calendarEnergyMode === calendarEnergyMode);
  });
  document.querySelectorAll("[data-recent-sort-direction]").forEach((button) => {
    button.classList.toggle("active", button.dataset.recentSortDirection === recentSortDirection);
  });

  if (isRecentView) {
    const from = Date.now() - calendarRecentDays * 24 * 60 * 60 * 1000;
    const recentEntries = sortRecentEntries(state.entries.filter((entry) => new Date(entry.createdAt).getTime() >= from));
    $("#calendarEntriesTitle").textContent = `최근 ${getRecentRangeLabel()} 기록`;
    renderCalendarSummary(recentEntries);
    renderEntryList(list, recentEntries, "이 기간에는 남겨둔 기록이 없어.");
    return;
  }

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const entryCounts = new Map();
  const entriesByDate = new Map();

  for (const entry of state.entries) {
    const key = getDateKey(entry.createdAt);
    entryCounts.set(key, (entryCounts.get(key) || 0) + 1);
    entriesByDate.set(key, [...(entriesByDate.get(key) || []), entry]);
  }

  $("#calendarMonthLabel").textContent = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(firstDay);

  const cells = [];
  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push(`<span class="calendar-day empty" aria-hidden="true"></span>`);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const key = getDateKey(date);
    const count = entryCounts.get(key) || 0;
    const dayEntries = entriesByDate.get(key) || [];
    const energyLevel = getCalendarEnergyLevel(dayEntries);
    const energyClass = energyLevel ? ` energy-${energyLevel.color}` : "";
    const isSelected = key === selectedDateKey;
    const isToday = key === getDateKey(new Date());
    cells.push(`
      <button class="calendar-day${energyClass}${isSelected ? " selected" : ""}${isToday ? " today" : ""}" type="button" data-calendar-date="${key}">
        <span>${day}</span>
        ${count ? `<strong>${count}</strong>` : ""}
      </button>
    `);
  }

  grid.innerHTML = cells.join("");

  const selectedEntries = state.entries
    .filter((entry) => getDateKey(entry.createdAt) === selectedDateKey)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  $("#calendarEntriesTitle").textContent = `${selectedDateKey} 기록`;
  renderCalendarSummary(selectedEntries);
  renderEntryList(list, selectedEntries, "이날의 너는 아직 남겨둔 게 없어.");
}

function getRecentRangeLabel() {
  if (calendarRecentDays === 7) return "1주";
  if (calendarRecentDays === 30) return "1개월";
  return "3개월";
}

function getCalendarEnergyLevel(entries) {
  if (!entries.length) return null;
  const mode = calendarEnergyMode;
  const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (mode === "first") return getEnergyLevel(sorted[0].energy);
  if (mode === "last") return getEnergyLevel(sorted[sorted.length - 1].energy);

  const counts = new Map();
  for (const entry of entries) {
    const energy = getEnergyLevel(entry.energy).value;
    counts.set(energy, (counts.get(energy) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const latestA = Math.max(
      ...entries
        .filter((entry) => getEnergyLevel(entry.energy).value === a[0])
        .map((entry) => new Date(entry.createdAt).getTime())
    );
    const latestB = Math.max(
      ...entries
        .filter((entry) => getEnergyLevel(entry.energy).value === b[0])
        .map((entry) => new Date(entry.createdAt).getTime())
    );
    return latestB - latestA;
  });
  return getEnergyLevel(ranked[0][0]);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function getWeekEntries() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.entries.filter((entry) => new Date(entry.createdAt).getTime() >= weekAgo);
}

function getDateLabel(date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function startOfDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getLetterPeriod(offset = selectedLetterOffset) {
  const sendDate = getLetterSendDate(offset);
  const periodStart = addDays(sendDate, -8);
  const periodEnd = sendDate;
  return { periodStart, periodEnd, sendDate };
}

function getLetterPeriodLabel(periodStart, periodEnd) {
  return `${getDateKey(periodStart)} ~ ${getDateKey(addDays(periodEnd, -1))}`;
}

function getNextLetterDate() {
  return addDays(getLetterSendDate(0), 7);
}

function getFirstInputStartDate() {
  return startOfDay(state.letterSettings.firstUsedAt || new Date());
}

function getFirstLetterSendDate() {
  return addDays(getFirstInputStartDate(), 8);
}

function getLatestLetterSendDate(fromDate = new Date()) {
  const today = startOfDay(fromDate);
  const firstSend = getFirstLetterSendDate();
  if (today < firstSend) return today;

  let cursor = firstSend;
  while (addDays(cursor, 7) <= today) {
    cursor = addDays(cursor, 7);
  }
  return cursor;
}

function getLetterSendDate(offset = selectedLetterOffset) {
  return addDays(getLatestLetterSendDate(), -offset * 7);
}

function canMoveToPreviousLetter() {
  return getLetterSendDate(selectedLetterOffset + 1) >= getFirstInputStartDate();
}

function getLetterPeriodStart(deliveredAt) {
  return new Date(new Date(deliveredAt).getTime() - 7 * DAY_MS);
}

function getNextLetterDeliveryDate(fromDate = new Date()) {
  const firstUsed = new Date(state.letterSettings.firstUsedAt);
  let cursor = new Date(firstUsed.getTime() + 7 * DAY_MS);
  const targetWeekday = Number(state.letterSettings.deliveryWeekday);
  while (cursor.getDay() !== targetWeekday) {
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  while (cursor <= fromDate) {
    cursor = new Date(cursor.getTime() + 7 * DAY_MS);
  }
  return cursor;
}

function getDueLetterDeliveries(now = new Date()) {
  const firstUsed = new Date(state.letterSettings.firstUsedAt);
  let cursor = new Date(firstUsed.getTime() + 7 * DAY_MS);
  const targetWeekday = Number(state.letterSettings.deliveryWeekday);
  while (cursor.getDay() !== targetWeekday) {
    cursor = new Date(cursor.getTime() + DAY_MS);
  }

  const existing = new Set(state.letters.map((letter) => letter.deliveredAt));
  const deliveries = [];
  while (cursor <= now) {
    const deliveredAt = cursor.toISOString();
    if (!existing.has(deliveredAt)) deliveries.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 7 * DAY_MS);
  }
  return deliveries;
}

function getEntriesForPeriod(start, end) {
  return state.entries.filter((entry) => {
    const time = new Date(entry.createdAt).getTime();
    return time >= start.getTime() && time < end.getTime();
  });
}

function tokenizeKoreanish(text) {
  const stop = new Set(["그리고", "그런데", "오늘", "내가", "나는", "너무", "조금", "계속", "생각", "있는", "같다", "해서", "하면"]);
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !stop.has(word));
}

function analyzeEntries(entries) {
  const counts = new Map();
  const moodCounts = new Map();
  const daySet = new Set();
  let energyTotal = 0;

  for (const entry of entries) {
    energyTotal += entry.energy;
    daySet.add(new Date(entry.createdAt).toDateString());
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
    for (const token of tokenizeKoreanish(entry.text)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  const themes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => `${word} (${count})`);

  const dominantMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "calm";
  const averageEnergy = entries.length ? (energyTotal / entries.length).toFixed(1) : "0";

  return { themes, dominantMood, averageEnergy, activeDays: daySet.size, entryCount: entries.length };
}

function getEntryMoment(entry) {
  return `${getDateKey(entry.createdAt)} ${formatTime(entry.createdAt)}`;
}

function getEntryPreview(entry) {
  const text = entry.text.trim();
  return text.length > 44 ? `${text.slice(0, 44)}...` : text;
}

function getEnergyExtremes(entries) {
  const ranked = [...entries].sort((a, b) => {
    if (b.energy !== a.energy) return b.energy - a.energy;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return {
    highest: ranked[0],
    lowest: ranked[ranked.length - 1],
  };
}

function getTopicInsight(entries) {
  const topicRules = [
    {
      label: "일",
      keywords: ["일", "업무", "회사", "회의", "마감", "프로젝트", "성과", "완벽", "상사", "동료", "잘해야"],
      observation: "일을 잘해야 한다는 압박이 너를 자주 붙잡고 있는 것 같아.",
      recommendation:
        "너무 완벽하게 해내려 하기보다 주변의 도움을 받고, 작은 단위의 일을 끝낸 것에서도 성취를 느껴보면 좋겠어.",
    },
    {
      label: "몸",
      keywords: ["피곤", "잠", "몸", "아픔", "두통", "식사", "체력", "쉬고", "휴식", "졸림"],
      observation: "몸의 신호가 생각보다 자주 마음의 분위기를 바꾸고 있어.",
      recommendation: "다음 주에는 의지로 밀어붙이기 전에 잠, 식사, 쉬는 시간을 먼저 챙겨봐.",
    },
    {
      label: "연애",
      keywords: [
        "연애",
        "사랑",
        "좋아",
        "썸",
        "데이트",
        "애인",
        "남자친구",
        "여자친구",
        "전남친",
        "전여친",
        "짝사랑",
        "헤어",
        "이별",
        "보고싶",
        "설렘",
        "서운",
        "질투",
      ],
      observation: "마음이 향하는 사람 앞에서 기대와 불안이 같이 움직이는 것 같아.",
      recommendation:
        "상대가 어떤 사람인지 판단하기 전에, 나는 어떤 관계에서 편안한지, 무엇을 받고 싶고 어디까지는 지키고 싶은지 먼저 알아보면 좋겠어.",
    },
    {
      label: "관계",
      keywords: ["친구", "가족", "연인", "동료", "사람", "말", "대화", "서운", "고마", "질투", "거리감", "상처", "섭섭", "눈치"],
      observation: "관계에서 받은 말과 분위기가 너의 생각 흐름에 꽤 오래 남는 편이야.",
      recommendation:
        "바로 결론을 내리기보다 내가 들은 말, 내가 붙인 해석, 내가 진짜 바라는 것을 나눠 적어봐. 원하는 걸 알아야 관계 안에서 나를 덜 잃어버려.",
    },
    {
      label: "나 자신",
      keywords: ["나", "자존감", "부족", "잘하고", "실패", "비교", "후회", "불안", "걱정"],
      observation: "스스로를 평가하는 말이 마음의 에너지를 많이 쓰게 하는 것 같아.",
      recommendation: "결과보다 오늘 실제로 한 행동 하나를 작게 인정해줘. 그게 다음 행동의 발판이 될 수 있어.",
    },
  ];

  const scores = topicRules.map((topic) => {
    const matchedEntries = entries.filter((entry) => topic.keywords.some((keyword) => entry.text.includes(keyword)));
    const lowEnergyCount = matchedEntries.filter((entry) => Number(entry.energy) <= 2).length;
    return { ...topic, count: matchedEntries.length, lowEnergyCount };
  });

  const ranked = scores.sort((a, b) => {
    if (b.lowEnergyCount !== a.lowEnergyCount) return b.lowEnergyCount - a.lowEnergyCount;
    return b.count - a.count;
  });
  return ranked[0]?.count ? ranked[0] : null;
}

function makeRecommendations(analysis, topicInsight) {
  const base = [
    "같은 생각이 반복될 때 사실, 해석, 내가 원하는 것을 한 줄씩 분리해보기",
    "마음이 흔들린 순간마다 내가 기대했던 것과 지키고 싶었던 선을 따로 적어보기",
    "다음 행동을 정하기 전에 지금 나한테 필요한 게 위로인지, 휴식인지, 확인인지 먼저 물어보기",
  ];

  const moodSpecific = {
    anxious: "불안이 올라올 때는 최악의 경우를 더 상상하기보다 내가 확인하고 싶은 것이 뭔지 먼저 적어보기",
    tired: "에너지가 낮은 시간대에는 뭘 더 해내야 하는지보다 지금 내 몸이 원하는 회복 조건을 먼저 챙기기",
    sad: "기분을 바꾸려 애쓰기보다 내가 잃었다고 느끼는 것, 받고 싶은 것을 한 문장으로 알아차리기",
    depressed: "우울감이 짙은 날에는 해야 할 일을 줄이고, 지금 나에게 필요한 최소한의 돌봄이 뭔지 먼저 정하기",
    angry: "반응하기 전에 메시지를 임시 보관하고, 내가 지키고 싶었던 기준이 무엇인지 20분 뒤 다시 읽어보기",
    complex: "복잡한 생각을 전부 풀려 하지 말고, 내가 원하는 것과 당장 결정하지 않아도 되는 것을 나눠보기",
    blank: "멍한 상태가 길어질 때 화면에서 눈을 떼고 물 한 잔 마신 뒤 지금 필요한 것 하나만 적어보기",
    moved: "뭉클했던 장면을 놓치지 말고 어떤 가치가 건드려졌는지, 내가 더 가까이 두고 싶은 게 뭔지 붙여보기",
    recovered: "회복감을 준 조건을 다음 주 일정에 하나 더 심어두고, 나에게 맞는 회복 방식으로 기억해두기",
    proud: "뿌듯했던 행동을 더 작게 쪼개 내가 계속 가져가고 싶은 방식으로 만들어보기",
    grateful: "고마운 순간을 만든 사람이나 조건을 기록하고, 내가 어떤 관계를 원했는지 단서로 남겨두기",
    peaceful: "평화로웠던 순간의 조건을 기록해 내가 편안해지는 환경을 다음 주 하루에 하나 복제하기",
    lucky: "운이 좋았다고 느낀 장면에서 내가 만든 작은 조건과 다시 바라는 방향을 함께 찾아보기",
    happy: "행복했던 순간을 만든 사람, 장소, 행동 중 내가 더 자주 만나고 싶은 것을 하나 고르기",
    delight: "기쁨이 올라온 순간을 그냥 넘기지 말고 무엇이 나를 웃게 했고 나는 뭘 더 원했는지 남기기",
    excited: "설렘이 생긴 방향을 놓치지 말고 내가 진짜 기대하는 것이 무엇인지 아주 작은 약속으로 이어보기",
    fun: "재밌다고 느낀 순간의 조건을 찾아서 내가 원하는 즐거움의 모양을 다음 주 일정에 한 번 더 넣어보기",
    selfEsteem: "자존감이 올라간 행동을 결과가 아니라 내가 지키고 싶은 태도 중심으로 다시 적어보기",
    irritated: "짜증이 올라올 때 바로 해결하려 하기보다 자극, 해석, 내가 원하는 것을 분리해보기",
    jealous: "질투가 생긴 대상에서 내가 진짜 원하는 가치나 욕구를 한 단어로 찾아보기",
    prideHurt: "자존심이 상한 순간에는 방어하기 전에 내가 인정받고 싶었던 부분과 지키고 싶었던 선을 적어보기",
    sensitive: "예민한 날에는 새 결정보다 수면, 식사, 일정 밀도를 먼저 점검하고 내가 필요한 여유를 확보하기",
    joy: "좋았던 순간의 조건을 적고 내가 더 자주 느끼고 싶은 감각을 다음 주 일정에 하나 더 넣기",
    calm: "집중이 잘 되는 조건을 관찰해서 내가 편안하게 몰입할 수 있는 방식을 다음 주 첫 업무 전에 복제하기",
  };

  return [topicInsight?.recommendation, moodSpecific[analysis.dominantMood], ...base].filter(Boolean).slice(0, 3);
}

function makeLetterTitle(analysis, topicInsight, highest, lowest) {
  const mood = getMoodLabel(analysis.dominantMood).replace(/\s+/g, " ");
  if (topicInsight?.label === "일") return "잘해내고 싶은 마음과 쉬어야 하는 신호가 같이 보였어";
  if (topicInsight?.label === "몸") return "몸이 먼저 알려준 마음의 리듬이 있었어";
  if (topicInsight?.label === "연애") return "설렘과 불안 사이에서 네가 바라는 관계를 찾고 있었어";
  if (topicInsight?.label === "관계") return "사람들 사이에서 네가 진짜 원한 것을 알아가는 중이었어";
  if (topicInsight?.label === "나 자신") return "스스로를 다그치는 마음 속에도 지키고 싶은 내가 있었어";
  if (Number(highest.energy) - Number(lowest.energy) >= 3) return "좋았던 순간과 닳았던 순간의 차이가 선명했던 한 주였어";
  return `${mood}이 자주 머물렀고, 너는 그 마음을 놓치지 않았어`;
}

function buildLetter(entries, periodStart, deliveredAt) {
  const periodEnd = new Date(deliveredAt);
  const periodLabel = getLetterPeriodLabel(periodStart, periodEnd);
  const savedLetter = state.letters.find((letter) => letter.id === deliveredAt);
  if (!entries.length) {
    return {
      id: deliveredAt,
      title: "이 기간에는 아직 전해줄 생각이 적었어",
      html: `<p class="muted">이 기간에는 기록이 아직 없어. 다음 편지에는 지금의 생각 몇 개만 남겨도, 나중의 나한테 지금의 너를 전해줄 수 있어.</p>`,
      themes: [],
      recommendations: [],
      createdAt: deliveredAt,
      deliveredAt,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      periodLabel,
      postscript: savedLetter?.postscript || "",
      version: LETTER_VERSION,
    };
  }

  const analysis = analyzeEntries(entries);
  const topicInsight = getTopicInsight(entries);
  const recommendations = makeRecommendations(analysis, topicInsight);
  const { highest, lowest } = getEnergyExtremes(entries);
  const themeText = analysis.themes.length ? analysis.themes.join(", ") : "아직 선명한 반복어는 적었어";
  const mood = getMoodLabel(analysis.dominantMood);
  const highMood = getMoodLabel(highest.mood);
  const lowMood = getMoodLabel(lowest.mood);
  const letterTitle = makeLetterTitle(analysis, topicInsight, highest, lowest);
  const topicParagraph = topicInsight
    ? `<p><strong>${topicInsight.label}</strong>에 관한 말이 반복됐어. 특히 에너지가 낮은 기록 안에서도 이 주제가 보였어. ${topicInsight.observation} ${topicInsight.recommendation} 건강 잘 챙기는 것도 잊지 말자. 잘하고 있어.</p>`
    : `<p>아직 한 가지 주제가 또렷하게 튀어나오진 않았어. 그래도 기록들이 알려주는 건 있어. 너는 감정이 지나간 뒤에야 알아차리는 사람이 아니라, 지나가는 중에도 붙잡아서 보려는 사람이야.</p>`;

  return {
    id: deliveredAt,
    title: letterTitle,
    html: `
      <div class="letter-meta">
        <span>${analysis.entryCount}개의 기록</span>
        <span>${analysis.activeDays}일의 흔적</span>
        <span>${periodLabel}</span>
        <span>평균 에너지 ${analysis.averageEnergy}/5</span>
        <span>주요 감정 ${mood}</span>
      </div>
      <h3>${letterTitle}</h3>
      <p>지난 주의 너는 <strong>${themeText}</strong> 같은 말을 자주 남겼어. 평균 에너지는 <strong>${analysis.averageEnergy}/5</strong>였고, 가장 자주 보인 감정은 <strong>${mood}</strong>이야.</p>
      <p>네 에너지가 가장 좋았을 때는 <strong>${getEntryMoment(highest)}</strong>였어. 그때는 <strong>${highMood}</strong>이었고, “${escapeHtml(getEntryPreview(highest))}”라고 남겼어. 이건 너한테 에너지를 주는 조건이 어딘가에 있었다는 단서야.</p>
      <p>반대로 에너지가 가장 낮았을 때는 <strong>${getEntryMoment(lowest)}</strong>였어. 그때는 <strong>${lowMood}</strong>이었고, “${escapeHtml(getEntryPreview(lowest))}”라는 생각이 남아 있었어. 이 순간은 네가 약했다는 증거가 아니라, 어떤 상황에서 마음의 배터리가 빨리 닳는지 알려주는 기록이야.</p>
      ${topicParagraph}
      <p>어떤 일이든, 특히 사람 사이의 일에서는 상대가 왜 그랬는지보다 <strong>내가 정말 원했던 게 무엇인지</strong>를 아는 게 먼저일 때가 많아. 인정받고 싶었는지, 안심하고 싶었는지, 더 솔직한 말을 듣고 싶었는지, 아니면 그냥 조금 쉬고 싶었는지. 그걸 알아야 다음 선택이 너를 덜 소모시켜.</p>
      <p>다음 주의 너한테 필요한 건 스스로를 고치는 태도보다 관찰하는 태도일지도 몰라. 생각이 반복될 때 “내가 왜 이러지?” 대신 “이 생각은 언제 강해지지?”와 “나는 여기서 뭘 바랐지?”라고 물어봐. 완벽한 계획보다 작은 실험 하나가 더 오래 가.</p>
    `,
    themes: analysis.themes,
    recommendations,
    createdAt: deliveredAt,
    deliveredAt,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    periodLabel,
    postscript: savedLetter?.postscript || "",
    version: LETTER_VERSION,
  };
}

function getSavedLetter(id) {
  const saved = state.letters.find((letter) => letter.id === id);
  return saved?.html ? saved : null;
}

function upsertLetter(letter) {
  const index = state.letters.findIndex((item) => item.id === letter.id);
  if (index >= 0) {
    state.letters[index] = { ...letter, postscript: state.letters[index].postscript || letter.postscript || "" };
  } else {
    state.letters.push(letter);
  }
  state.letters.sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));
}

function getOrCreateLetter(periodStart, periodEnd) {
  const id = periodEnd.toISOString();
  const saved = getSavedLetter(id);
  if (saved) return saved;

  const entries = getEntriesForPeriod(periodStart, periodEnd);
  const letter = buildLetter(entries, periodStart, id);
  upsertLetter(letter);
  saveState();
  return letter;
}

function syncLetters() {
  let changed = false;
  if (state.letter && !state.letters.length) {
    state.letters = [{ ...state.letter, id: state.letter.createdAt || new Date().toISOString(), deliveredAt: state.letter.createdAt || new Date().toISOString() }];
    changed = true;
  }

  for (const delivery of getDueLetterDeliveries()) {
    const periodStart = getLetterPeriodStart(delivery);
    const periodEntries = getEntriesForPeriod(periodStart, delivery);
    state.letters.push(buildLetter(periodEntries, periodStart, delivery.toISOString()));
    changed = true;
  }

  state.letters = state.letters
    .filter((letter) => letter.version === LETTER_VERSION)
    .sort((a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt));

  state.letter = state.letters[0] || null;
  if (changed) saveState();
}

function renderLetter() {
  const paper = $("#letterPaper");
  const themeList = $("#themeList");
  const recommendationList = $("#recommendationList");
  const postscriptInput = $("#letterPostscriptInput");
  const postscriptSaveButton = $("#letterPostscriptSaveButton");
  const { periodStart, periodEnd, sendDate } = getLetterPeriod();
  const selectedLetter = getOrCreateLetter(periodStart, periodEnd);
  activeLetter = selectedLetter;
  state.letter = selectedLetter;

  $("#letterPeriodLabel").textContent = selectedLetter.periodLabel;
  $("#letterSendDateLabel").textContent = `편지 받은 날: ${getDateKey(sendDate)}`;
  $("#letterNextStatus").textContent = `다음 편지: ${getDateKey(addDays(sendDate, 7))}`;
  $("#prevLetterButton").disabled = !canMoveToPreviousLetter();
  $("#nextLetterButton").disabled = selectedLetterOffset === 0;

  postscriptInput.disabled = false;
  postscriptSaveButton.disabled = false;
  postscriptInput.value = selectedLetter.postscript || "";
  paper.innerHTML = selectedLetter.html;
  themeList.innerHTML = (selectedLetter.themes.length ? selectedLetter.themes : ["아직 반복어가 적어."])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  recommendationList.innerHTML = (selectedLetter.recommendations.length ? selectedLetter.recommendations : ["기록을 조금 더 남겨봐."])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  $("#shareLetterButton").disabled = false;
}

function getSelectedLetter() {
  return activeLetter || state.letter;
}

function getPlainLetterText(letter) {
  const temp = document.createElement("div");
  temp.innerHTML = letter.html;
  const body = temp.textContent.replace(/\s+/g, " ").trim();
  const postscript = letter.postscript ? `\n\n추신\n${letter.postscript}` : "";
  return `Log to Letter - ${letter.title || "지난 주의 편지"}\n${letter.periodLabel || ""}\n\n${body}${postscript}`;
}

function getLetterParagraphs(letter) {
  const temp = document.createElement("div");
  temp.innerHTML = letter.html;
  return [...temp.querySelectorAll("p")]
    .map((paragraph) => paragraph.textContent.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getShareCaption(letter, maxLength) {
  const paragraphs = getLetterParagraphs(letter);
  const text = [
    `Log to Letter, ${letter.periodLabel || "지난 주의 편지"}`,
    letter.title || "지난 주의 편지",
    paragraphs[0] || "",
    "#LogToLetter #생각기록 #주간편지",
  ]
    .filter(Boolean)
    .join("\n\n");
  return truncateText(text, maxLength);
}

async function copyShareText(kind) {
  const letter = getSelectedLetter();
  if (!letter) return;
  const text = kind === "threads" ? getShareCaption(letter, 500) : getShareCaption(letter, 2200);
  await navigator.clipboard.writeText(text);
  showToast(kind === "threads" ? "스레드용 문장을 복사했어" : "인스타 캡션을 복사했어");
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = testLine;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => context.fillText(item, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function drawShareImage(letter, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const padding = Math.round(width * 0.08);
  context.fillStyle = "#f5f8f1";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#e7f6df";
  context.fillRect(0, 0, width, Math.round(height * 0.16));
  context.fillStyle = "#2f8f54";
  context.font = `800 ${Math.round(width * 0.034)}px system-ui, sans-serif`;
  context.fillText("Log to Letter", padding, padding);
  context.font = `700 ${Math.round(width * 0.028)}px system-ui, sans-serif`;
  context.fillText(letter.periodLabel || "지난 주의 편지", padding, padding + Math.round(width * 0.052));
  context.fillStyle = "#18241b";
  context.font = `900 ${Math.round(width * 0.06)}px system-ui, sans-serif`;
  let y = Math.round(height * 0.23);
  y = wrapCanvasText(context, letter.title || "지난 주의 편지", padding, y, width - padding * 2, Math.round(width * 0.078), 4);
  context.fillStyle = "#657064";
  context.font = `500 ${Math.round(width * 0.034)}px system-ui, sans-serif`;
  const paragraphs = getLetterParagraphs(letter);
  const body = paragraphs.slice(0, 3).join(" ");
  y += Math.round(width * 0.06);
  wrapCanvasText(context, body, padding, y, width - padding * 2, Math.round(width * 0.054), height > 1500 ? 12 : 8);
  context.fillStyle = "#2f8f54";
  context.font = `800 ${Math.round(width * 0.028)}px system-ui, sans-serif`;
  context.fillText("지난 날의 네가 보낸 편지", padding, height - padding);
  return canvas;
}

function downloadShareImage(kind) {
  const letter = getSelectedLetter();
  if (!letter) return;
  const size = kind === "story" ? { width: 1080, height: 1920 } : { width: 1080, height: 1350 };
  const canvas = drawShareImage(letter, size.width, size.height);
  const link = document.createElement("a");
  link.download = `log-to-letter-${kind}-${getDateKey(letter.deliveredAt || new Date())}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast(kind === "story" ? "스토리 이미지를 내려받았어" : "피드 이미지를 내려받았어");
}

function openShareDialog() {
  if (!getSelectedLetter()) return;
  $("#shareDialog").showModal();
}

function renderSettings() {
  $("#startTimeInput").value = state.settings.startTime;
  $("#dndStartInput").value = state.settings.dndStart;
  $("#dndEndInput").value = state.settings.dndEnd;
  $("#intervalInput").value = state.settings.intervalMinutes;
  if (!("Notification" in window)) {
    permissionStatus.textContent = "미지원";
    $("#notificationStatusLabel").textContent = "알림 미지원";
    $("#scheduleOptions").hidden = true;
    $("#notificationToggle").checked = false;
    $("#notificationToggle").disabled = true;
    $("#notificationIcon").textContent = "🔕";
  } else {
    const isOn = Boolean(state.settings.notificationsEnabled);
    permissionStatus.textContent = isOn && Notification.permission !== "granted" ? "권한 필요" : isOn ? "알림 켜짐" : "알림 꺼짐";
    $("#notificationStatusLabel").textContent = isOn ? "알림 켜짐" : "알림 꺼짐";
    $("#scheduleOptions").hidden = !isOn;
    $("#notificationToggle").checked = isOn;
    $("#notificationToggle").disabled = false;
    $("#notificationIcon").textContent = isOn ? "🔔" : "🔕";
  }
  renderTestConsole();
}

async function renderTestConsole() {
  $("#testPermissionState").textContent = getPermissionLabel();
  $("#testMicrophoneState").textContent = await getMicrophonePermissionLabel();
  $("#testAppState").textContent = state.settings.notificationsEnabled ? "켜짐" : "꺼짐";
  $("#testNextPrompt").textContent = state.settings.enabled ? formatDateTime(getNextPromptDate()) : "없음";
  document.querySelectorAll("[data-test-permission]").forEach((button) => {
    const active = getTestPermission(button.dataset.testPermission) === button.dataset.testValue;
    button.classList.toggle("active", active);
  });
}

function renderMoodOptions() {
  const selectedMood = $("#moodInput").value || "calm";
  const renderGroup = (category) => {
    const categoryMoods = moods.filter((mood) => mood.category === category);
    const visibleMoods = expandedMoods[category] ? categoryMoods : categoryMoods.slice(0, 3);
    return visibleMoods
      .map(
        (mood) => `
          <button class="mood-option" type="button" data-mood="${mood.key}" aria-pressed="${mood.key === selectedMood}">
            ${mood.label}
          </button>
        `
      )
      .join("");
  };

  $("#positiveMoodOptions").innerHTML = renderGroup("positive");
  $("#negativeMoodOptions").innerHTML = renderGroup("negative");
  document.querySelectorAll("[data-expand-mood]").forEach((button) => {
    const category = button.dataset.expandMood;
    button.textContent = expandedMoods[category] ? "⌃" : "+";
    button.setAttribute("aria-expanded", String(expandedMoods[category]));
  });
}

function render() {
  renderMoodOptions();
  renderEnergyMeter();
  renderVoiceControls();
  renderCalendar();
  renderLetter();
  renderSettings();
  renderAuth();
  updateNextPrompt();
  updateEntrySubmitState();
}

function appendSpeechText(baseText, speechText) {
  const cleanBase = baseText.trimEnd();
  const cleanSpeech = speechText.trim();
  if (!cleanBase) return cleanSpeech;
  if (!cleanSpeech) return cleanBase;
  return `${cleanBase}\n${cleanSpeech}`;
}

function setVoiceStatus(statusElement, message) {
  if (statusElement) statusElement.textContent = message;
}

function stopVoiceInput(message = "받아쓰기를 멈췄어.", shouldStop = true) {
  if (speechRecognition) {
    speechRecognition.onend = null;
    if (shouldStop) {
      try {
        speechRecognition.stop();
      } catch {
        // The browser may already have ended recognition.
      }
    }
  }
  if (speechListeningButton) {
    speechListeningButton.classList.remove("listening");
    speechListeningButton.setAttribute("aria-pressed", "false");
  }
  setVoiceStatus(speechListeningStatus, message);
  speechRecognition = null;
  speechListeningButton = null;
  speechListeningTarget = null;
  speechListeningStatus = null;
  speechBaseText = "";
  speechFinalText = "";
}

function startVoiceInput(button) {
  const Recognition = getSpeechRecognitionConstructor();
  const target = $(button.dataset.voiceTarget);
  const status = $(button.dataset.voiceStatus);
  const microphoneTestState = getTestPermission("microphone");
  if (microphoneTestState === "denied") {
    setVoiceStatus(status, "마이크 권한이 차단된 걸로 치고 테스트 중이야.");
    renderTestConsole();
    return;
  }
  if (microphoneTestState === "granted") {
    target.value = appendSpeechText(target.value, "마이크 권한이 허용된 걸로 치고 남긴 테스트 문장이야.");
    setVoiceStatus(status, "허용된 걸로 치고 예시 문장을 받아썼어.");
    renderTestConsole();
    return;
  }
  if (!Recognition || !target) {
    setVoiceStatus(status, "이 브라우저에서는 음성 받아쓰기를 지원하지 않아.");
    return;
  }

  if (speechListeningButton === button) {
    stopVoiceInput();
    return;
  }

  if (speechRecognition) stopVoiceInput("다른 받아쓰기를 멈췄어.");

  speechRecognition = new Recognition();
  speechListeningButton = button;
  speechListeningTarget = target;
  speechListeningStatus = status;
  speechBaseText = target.value;
  speechFinalText = "";

  speechRecognition.lang = "ko-KR";
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;

  speechRecognition.onstart = () => {
    button.classList.add("listening");
    button.setAttribute("aria-pressed", "true");
    target.focus();
    setVoiceStatus(status, "듣고 있어. 편하게 말해봐.");
  };

  speechRecognition.onresult = (event) => {
    let interimText = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript;
      if (event.results[index].isFinal) {
        speechFinalText = `${speechFinalText} ${transcript}`.trim();
      } else {
        interimText = `${interimText} ${transcript}`.trim();
      }
    }
    target.value = appendSpeechText(speechBaseText, `${speechFinalText} ${interimText}`);
    setVoiceStatus(status, interimText ? "말을 문장으로 옮기는 중이야." : "문장을 받아썼어. 계속 말해도 돼.");
    updateEntrySubmitState();
  };

  speechRecognition.onerror = (event) => {
    const messages = {
      "not-allowed": "마이크 권한이 필요해. 브라우저나 기기 설정에서 마이크를 허용해줘.",
      "no-speech": "소리가 잘 들리지 않았어. 다시 눌러 말해봐.",
      "audio-capture": "마이크를 찾을 수 없어. 기기 마이크 설정을 확인해줘.",
    };
    stopVoiceInput(messages[event.error] || "음성 인식 중 문제가 생겼어. 다시 시도해봐.");
    renderTestConsole();
  };

  speechRecognition.onend = () => {
    stopVoiceInput(speechFinalText ? "받아쓰기가 끝났어." : "받아쓰기를 멈췄어.", false);
    renderTestConsole();
  };

  try {
    speechRecognition.start();
  } catch {
    stopVoiceInput("음성 받아쓰기를 시작하지 못했어. 잠시 뒤 다시 시도해봐.", false);
  }
}

function renderVoiceControls() {
  const supported = Boolean(getSpeechRecognitionConstructor());
  document.querySelectorAll("[data-voice-target]").forEach((button) => {
    button.disabled = !supported;
    const status = $(button.dataset.voiceStatus);
    if (!supported) {
      setVoiceStatus(status, "이 브라우저에서는 음성 받아쓰기를 지원하지 않아.");
    }
  });
}

function renderEnergyMeter() {
  const meter = $("#energyLevels");
  const input = $("#energyInput");
  if (!meter || !input) return;
  const selected = input.value ? getEnergyLevel(input.value).value : null;
  meter.innerHTML = energyLevels
    .map(
      (level) => `
        <button class="energy-level energy-${level.color}${level.value === selected ? " active" : ""}" type="button" data-energy="${level.value}" aria-pressed="${level.value === selected}" aria-label="에너지 ${level.value}, ${level.label}">
          <span class="energy-swatch" aria-hidden="true"></span>
          <small>${level.value}</small>
        </button>
      `
    )
    .join("");
}

function getEntryFormMissingParts() {
  const missing = [];
  if (!$("#thoughtInput").value.trim()) missing.push("생각");
  if (!$("#moodInput").value) missing.push("감정");
  if (!$("#energyInput").value) missing.push("에너지");
  return missing;
}

function updateEntrySubmitState() {
  const button = $("#entrySubmitButton");
  const hint = $("#entryFormHint");
  if (!button || !hint) return;
  const missing = getEntryFormMissingParts();
  hint.textContent = missing.length ? `${missing.join(", ")}까지 남기면 기록할 수 있어.` : "좋아, 이제 기록으로 남길 수 있어.";
  button.dataset.ready = String(!missing.length);
}

function switchView(viewName) {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = $("#appToast");
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function seedDemoData() {
  const { periodStart, periodEnd } = getLetterPeriod(0);
  const makeDate = (dayOffset, hour, minute = 0) =>
    new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + dayOffset, hour, minute, 0).toISOString();
  const examples = [
    ["일을 잘해야 한다는 생각이 너무 커져서 시작하기 전부터 어깨가 굳었다.", "anxious", 2, makeDate(0, 9)],
    ["회의에서 내가 말한 부분이 계속 마음에 걸린다. 사실보다 해석을 더 크게 만들고 있는 것 같다.", "sensitive", 2, makeDate(0, 18)],
    ["아침에 산책하고 나니 몸이 조금 풀렸다. 생각이 느슨해지는 느낌이 있었다.", "calm", 4, makeDate(1, 8)],
    ["해야 할 일이 많은데 무엇부터 잡아야 할지 몰라서 계속 미루고 있다.", "complex", 2, makeDate(1, 21)],
    ["동료에게 도움을 요청했더니 생각보다 일이 작게 나뉘었다. 혼자 다 하려고 했던 것 같다.", "grateful", 4, makeDate(2, 15)],
    ["좋아하는 사람의 답장이 늦으니까 괜히 내가 뭘 잘못했나 싶었다. 내가 원하는 건 안심인 것 같다.", "anxious", 2, makeDate(2, 23)],
    ["오래 미뤄둔 메일 하나를 보냈다. 작지만 꽤 가벼워졌다.", "joy", 4, makeDate(3, 10)],
    ["저녁에는 에너지가 너무 낮아서 결정하는 일이 버겁다. 오늘은 빨리 자야겠다.", "tired", 1, makeDate(3, 22)],
    ["친구랑 짧게 통화했는데 마음이 정리됐다. 내가 듣고 싶었던 건 해결책보다 괜찮다는 말이었다.", "peaceful", 4, makeDate(4, 19)],
    ["아이디어만으로 뭔가를 할 수 있다는 생각에 설렜다. 재밌어.", "excited", 5, makeDate(5, 11)],
    ["일을 완벽하게 끝내야 한다는 마음 때문에 작은 성취를 못 보고 지나친 것 같다.", "prideHurt", 2, makeDate(5, 20)],
    ["그래도 오늘 나 자신이 꽤 괜찮았던 순간이 있었다. 작은 단위로 끝낸 일이 나를 살렸다.", "proud", 5, makeDate(6, 22)],
  ];

  for (const [text, mood, energy, createdAt] of examples) {
    state.entries.unshift({ id: crypto.randomUUID(), text, mood, energy, createdAt });
  }
  selectedDateKey = getDateKey(addDays(periodEnd, -1));
  calendarCursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  state.letter = null;
  saveState();
  render();
  switchView("letter");
  showToast("지난주 예시 기록을 넣었어");
}

function seedLovePreviousWeekData() {
  const { periodStart, periodEnd } = getLetterPeriod(1);
  const demoTag = `love-demo-${getDateKey(periodStart)}`;
  state.entries = state.entries.filter((entry) => entry.demoTag !== demoTag);
  const makeDate = (dayOffset, hour, minute = 0) =>
    new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + dayOffset, hour, minute, 0).toISOString();
  const examples = [
    ["좋아하는 사람의 답장이 늦어지니까 하루 종일 신경이 쓰였다. 내가 원하는 건 확신보다 안심에 가까운 것 같다.", "anxious", 2, makeDate(0, 10)],
    ["연애에서 내가 자꾸 상대의 기분을 먼저 살피는 것 같다. 정작 내가 원하는 관계가 뭔지는 잘 안 물어봤다.", "complex", 2, makeDate(0, 22)],
    ["데이트 약속을 잡고 나니 설렜다. 편하게 웃을 수 있는 사람이 좋다는 걸 다시 느꼈다.", "excited", 5, makeDate(1, 18)],
    ["상대가 무심하게 한 말이 계속 마음에 남았다. 사실은 더 다정한 확인을 받고 싶었던 것 같다.", "sensitive", 2, makeDate(1, 23)],
    ["친구한테 연애 고민을 말했더니 내가 원하는 게 뭔지 먼저 알아야 한다고 했다. 그 말이 오래 남았다.", "calm", 3, makeDate(2, 14)],
    ["좋아하는 마음이 커지니까 질투도 같이 커졌다. 내가 바라는 건 비교가 아니라 존중받는 느낌인 것 같다.", "jealous", 2, makeDate(2, 21)],
    ["짧게라도 솔직하게 말했더니 마음이 조금 가벼워졌다. 내가 감추고 싶었던 건 서운함이었다.", "recovered", 4, makeDate(3, 20)],
    ["상대에게 맞추려고 하다 보니 내 일정이 무너졌다. 관계 안에서도 내 리듬을 지키고 싶다.", "tired", 2, makeDate(3, 23)],
    ["오늘은 답장을 기다리지 않고 내 일을 했다. 이상하게 자존감이 조금 올라갔다.", "selfEsteem", 4, makeDate(4, 16)],
    ["보고 싶다는 말을 꺼내기 어렵다. 거절당할까 봐 무서운 마음이 큰 것 같다.", "anxious", 2, makeDate(4, 22)],
    ["함께 산책한 시간이 좋았다. 거창한 이벤트보다 편안하게 같이 있는 순간을 더 원했던 것 같다.", "happy", 5, makeDate(5, 19)],
    ["이번 연애 고민은 상대를 맞히는 문제가 아니라 내가 어떤 사랑을 원하는지 알아가는 과정인 것 같다.", "peaceful", 4, makeDate(6, 21)],
  ];

  for (const [text, mood, energy, createdAt] of examples) {
    state.entries.unshift({ id: crypto.randomUUID(), text, mood, energy, createdAt, demoTag });
  }
  selectedLetterOffset = 1;
  selectedDateKey = getDateKey(addDays(periodEnd, -1));
  calendarCursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  state.letter = null;
  saveState();
  render();
  switchView("letter");
  showToast("5/20~5/26 연애 예시를 넣었어");
}

document.addEventListener("click", (event) => {
  const voiceButton = event.target.closest("[data-voice-target]");
  if (voiceButton) {
    startVoiceInput(voiceButton);
    return;
  }

  const testPermissionButton = event.target.closest("[data-test-permission]");
  if (testPermissionButton) {
    state.testOverrides[testPermissionButton.dataset.testPermission] = testPermissionButton.dataset.testValue;
    saveState();
    renderTestConsole();
    writeTestLog(
      testPermissionButton.dataset.testValue === "actual"
        ? "실제 권한 상태로 다시 보는 중이야."
        : `${testPermissionButton.textContent.trim()}된 걸로 치고 테스트할게.`
    );
    return;
  }

  const navButton = event.target.closest(".nav-button");
  if (navButton) {
    switchView(navButton.dataset.view);
  }

  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    state.entries = state.entries.filter((entry) => entry.id !== deleteButton.dataset.delete);
    state.letter = null;
    saveState();
    deleteCloudEntry(deleteButton.dataset.delete);
    render();
  }

  const calendarButton = event.target.closest("[data-calendar-date]");
  if (calendarButton) {
    selectedDateKey = calendarButton.dataset.calendarDate;
    calendarCursor = new Date(`${selectedDateKey}T00:00:00`);
    renderCalendar();
  }

  const moodButton = event.target.closest("[data-mood]");
  if (moodButton) {
    $("#moodInput").value = moodButton.dataset.mood;
    renderMoodOptions();
    updateEntrySubmitState();
  }

  const expandMoodButton = event.target.closest("[data-expand-mood]");
  if (expandMoodButton) {
    const category = expandMoodButton.dataset.expandMood;
    expandedMoods[category] = !expandedMoods[category];
    renderMoodOptions();
  }

  const energyButton = event.target.closest("[data-energy]");
  if (energyButton) {
    $("#energyInput").value = energyButton.dataset.energy;
    renderEnergyMeter();
    updateEntrySubmitState();
  }

  const sortDirectionButton = event.target.closest("[data-recent-sort-direction]");
  if (sortDirectionButton) {
    recentSortDirection = sortDirectionButton.dataset.recentSortDirection;
    renderCalendar();
  }

});

$("#entryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const missing = getEntryFormMissingParts();
  if (missing.length) {
    updateEntrySubmitState();
    $("#entryFormHint").textContent = `${missing.join(", ")}이 아직 비어 있어. 이걸 채우면 캘린더에 남길게.`;
    return;
  }
  addEntry($("#thoughtInput").value, $("#moodInput").value, $("#energyInput").value);
  if (speechRecognition) stopVoiceInput("기록을 저장해서 받아쓰기를 멈췄어.");
  event.target.reset();
  $("#moodInput").value = "";
  $("#energyInput").value = "";
  renderMoodOptions();
  renderEnergyMeter();
  updateEntrySubmitState();
  renderCalendar();
  switchView("calendar");
  showToast("남기기 완료");
});

$("#thoughtInput").addEventListener("input", updateEntrySubmitState);

$("#prevMonthButton").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});

$("#nextMonthButton").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelectorAll("[data-calendar-energy-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    calendarEnergyMode = button.dataset.calendarEnergyMode;
    renderCalendar();
  });
});

document.querySelectorAll("[data-calendar-view]").forEach((button) => {
  button.addEventListener("click", () => {
    calendarViewMode = button.dataset.calendarView;
    renderCalendar();
  });
});

document.querySelectorAll("[data-calendar-range]").forEach((button) => {
  button.addEventListener("click", () => {
    calendarRecentDays = Number(button.dataset.calendarRange);
    renderCalendar();
  });
});

$("#recentSortSelect").addEventListener("change", (event) => {
  recentSortKey = event.target.value;
  renderCalendar();
});

$("#shareLetterButton").addEventListener("click", openShareDialog);

$("#copyThreadsButton").addEventListener("click", () => {
  copyShareText("threads");
});

$("#copyInstagramButton").addEventListener("click", () => {
  copyShareText("instagram");
});

$("#downloadFeedImageButton").addEventListener("click", () => {
  downloadShareImage("feed");
});

$("#downloadStoryImageButton").addEventListener("click", () => {
  downloadShareImage("story");
});

$("#prevLetterButton").addEventListener("click", () => {
  if (!canMoveToPreviousLetter()) return;
  selectedLetterOffset += 1;
  renderLetter();
});

$("#nextLetterButton").addEventListener("click", () => {
  if (selectedLetterOffset === 0) return;
  selectedLetterOffset -= 1;
  renderLetter();
});

$("#letterPostscriptForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const letter = getSelectedLetter();
  if (!letter) return;
  letter.postscript = $("#letterPostscriptInput").value.trim();
  const savedIndex = state.letters.findIndex((item) => item.id === letter.id);
  if (savedIndex >= 0) {
    state.letters[savedIndex] = { ...state.letters[savedIndex], postscript: letter.postscript, version: LETTER_VERSION };
  } else {
    state.letters.push({ ...letter, version: LETTER_VERSION });
  }
  state.letter = { ...letter };
  saveState();
  showToast("추신을 저장했어");
});

$("#settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings = {
    startTime: $("#startTimeInput").value,
    dndStart: $("#dndStartInput").value,
    dndEnd: $("#dndEndInput").value,
    intervalMinutes: Number($("#intervalInput").value),
    enabled: state.settings.notificationsEnabled,
    notificationsEnabled: state.settings.notificationsEnabled,
  };
  saveState();
  startPromptLoop();
  render();
});

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("#authEmailInput").value.trim();
  await sendLoginLink(email);
});

$("#googleLoginButton").addEventListener("click", signInWithGoogle);
$("#signOutButton").addEventListener("click", signOut);

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $("#intervalInput");
    const next = Number(input.value) + Number(button.dataset.step);
    input.value = Math.min(360, Math.max(15, next));
  });
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $("#thoughtInput");
    const prompt = button.dataset.prompt;
    input.value = input.value.trim() ? `${input.value.trim()}\n${prompt}` : prompt;
    input.focus();
    updateEntrySubmitState();
  });
});

$("#notificationToggle").addEventListener("change", async (event) => {
  if (!("Notification" in window)) return;
  const wantsOn = event.target.checked;
  state.settings.notificationsEnabled = wantsOn;
  state.settings.enabled = wantsOn;
  saveState();
  startPromptLoop();
  renderSettings();

  if (wantsOn && Notification.permission === "default") {
    await Notification.requestPermission();
    renderSettings();
  }
});

$("#refreshTestConsoleButton").addEventListener("click", renderTestConsole);

$("#requestPermissionButton").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    writeTestLog("이 브라우저에서는 알림을 지원하지 않아.");
    renderTestConsole();
    return;
  }
  if (Notification.permission === "denied") {
    writeTestLog("알림이 차단되어 있어. 브라우저나 기기 설정에서 이 앱의 알림을 허용해야 해.");
    renderTestConsole();
    return;
  }
  const permission = await Notification.requestPermission();
  writeTestLog(permission === "granted" ? "알림 권한이 허용됐어." : "알림 권한이 아직 허용되지 않았어.");
  renderSettings();
});

$("#sendTestNotificationButton").addEventListener("click", () => {
  if (sendBrowserNotification("Log to Letter 테스트", "알림이 정상적으로 도착하면 설정이 잘 된 거야.")) {
    writeTestLog("즉시 테스트 알림을 보냈어.");
  }
  renderTestConsole();
});

$("#scheduleTestNotificationButton").addEventListener("click", () => {
  writeTestLog("10초 뒤 테스트 알림을 예약했어. 이 창을 열어둔 상태에서 확인해봐.");
  window.setTimeout(() => {
    sendBrowserNotification("Log to Letter 10초 테스트", "10초 뒤 알림이 도착했어.");
    renderTestConsole();
  }, 10000);
});

$("#openPromptTestButton").addEventListener("click", () => {
  writeTestLog("앱 안 팝업을 열었어. 실제 질문 입력 흐름을 테스트할 수 있어.");
  openDialog();
});

$("#askNowButton").addEventListener("click", showPrompt);
$("#exportButton").addEventListener("click", () => {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `log-to-letter-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});
$("#clearEntriesButton").addEventListener("click", () => {
  state.entries = [];
  state.letter = null;
  saveState();
  clearCloudJournalData();
  render();
});

$("#dialogSaveButton").addEventListener("click", (event) => {
  const value = $("#dialogThoughtInput").value.trim();
  if (!value) {
    event.preventDefault();
    return;
  }
  addEntry(value, "calm", 3);
  switchView("calendar");
  showToast("남기기 완료");
});

const startupParams = new URLSearchParams(window.location.search);
async function boot() {
  if (startupParams.get("seed") === "love-prev") {
    seedLovePreviousWeekData();
    window.history.replaceState(null, "", `${window.location.pathname}?v=95`);
  } else {
    render();
  }
  await initAuth();
  startPromptLoop();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

boot();
