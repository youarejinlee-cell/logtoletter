import { useEffect, useRef, useState } from "react";
import { Keyboard, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { useAppTheme } from "../lib/theme";
import { NotificationSettings } from "../types/domain";

const weekdays = [
  { value: 1, label: "일" },
  { value: 2, label: "월" },
  { value: 3, label: "화" },
  { value: 4, label: "수" },
  { value: 5, label: "목" },
  { value: 6, label: "금" },
  { value: 7, label: "토" }
];

const MIN_INTERVAL_MINUTES = 10;
const MAX_INTERVAL_MINUTES = 120;
const INTERVAL_STEP_MINUTES = 5;
const intervalOptions = Array.from(
  { length: (MAX_INTERVAL_MINUTES - MIN_INTERVAL_MINUTES) / INTERVAL_STEP_MINUTES + 1 },
  (_, index) => MIN_INTERVAL_MINUTES + index * INTERVAL_STEP_MINUTES
);
const hourOptions = Array.from({ length: 24 }, (_, index) => index);
const minuteOptions = Array.from({ length: 60 }, (_, index) => index);
const TIME_WHEEL_ITEM_HEIGHT = 42;

type Props = {
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
  onSave: (settings: NotificationSettings) => Promise<void> | void;
};

export function SettingsScreen({ settings, onChange, onSave }: Props) {
  const theme = useAppTheme();
  const [draftSettings, setDraftSettings] = useState(settings);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [adjustedNotice, setAdjustedNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  useEffect(() => {
    setDraftSettings(settings);
    if (!settings.enabled) setEditing(false);
  }, [settings]);

  const handleSave = async () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setSaveState("saving");
    setAdjustedNotice(null);
    setValidationError(null);
    const error = validateNotificationSettings(draftSettings);
    if (error) {
      setSaveState("idle");
      setValidationError(error);
      return;
    }
    const normalized = normalizeNotificationSettings(draftSettings);
    if (draftSettings.scheduleMode === "interval" && normalized.intervalMinutes !== draftSettings.intervalMinutes) {
      setAdjustedNotice(`알림 간격은 ${normalized.intervalMinutes}분으로 맞췄어.`);
    }
    try {
      await onSave(normalized);
      onChange(normalized);
      setDraftSettings(normalized);
      setSaveState("saved");
      setEditing(false);
    } catch (error) {
      setSaveState("failed");
      setValidationError(error instanceof Error ? error.message : "알림 설정을 저장하지 못했어.");
    }
    feedbackTimer.current = setTimeout(() => setSaveState("idle"), 1800);
  };

  const handleToggle = async (enabled: boolean) => {
    const next = { ...(editing ? draftSettings : settings), enabled };
    setDraftSettings(next);
    setValidationError(null);
    if (enabled) {
      setEditing(true);
      return;
    }

    setEditing(false);
    setSaveState("saving");
    try {
      await onSave(next);
      onChange(next);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
    feedbackTimer.current = setTimeout(() => setSaveState("idle"), 1800);
  };

  const summary = getNotificationSummary(settings);
  const draftSummary = getNotificationSummary(draftSettings);

  return (
    <Screen
      eyebrow="NOTIFICATION"
      title="기록 알림 설정"
      lead="순간의 생각을 기록할 수 있도록 앱 푸시를 보내줄게."
      dismissKeyboardOnTouchOutside
    >
      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>알림 설정</Text>
          <View style={styles.switchWrap}>
            <Switch
              value={editing ? draftSettings.enabled : settings.enabled}
              onValueChange={handleToggle}
              trackColor={{ false: "#e68a8a", true: "#8ed08b" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {!editing ? (
          <View style={[styles.summaryBox, { backgroundColor: theme.soft, borderColor: theme.border }]}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>{settings.enabled ? "알림 요약" : "알림이 설정되어 있지 않아"}</Text>
              {settings.enabled ? (
                <Pressable
                  style={[styles.changeButton, { backgroundColor: theme.tint }]}
                  onPress={() => {
                    setDraftSettings(settings);
                    setEditing(true);
                  }}
                >
                  <Text style={styles.changeButtonText}>변경</Text>
                </Pressable>
              ) : null}
            </View>
            {settings.enabled ? (
              <>
                {summary.lines.map((line) => (
                  <Text key={line} style={styles.summaryLine}>{line}</Text>
                ))}
                <Text style={[styles.summaryCount, { color: theme.tint }]}>{summary.countText}</Text>
              </>
            ) : (
              <Text style={styles.summaryLine}>알림을 켜면 기록할 순간을 놓치지 않게 도와줄게.</Text>
            )}
          </View>
        ) : null}

        {draftSettings.enabled && editing ? (
          <>
            <View style={[styles.modeSwitch, { backgroundColor: theme.soft }]}>
              <Pressable
                style={[styles.modeButton, draftSettings.scheduleMode !== "fixed" && { backgroundColor: theme.tint }]}
                onPress={() => {
                  Keyboard.dismiss();
                  setDraftSettings({ ...draftSettings, scheduleMode: "interval" });
                }}
              >
                <Text style={[styles.modeText, draftSettings.scheduleMode !== "fixed" && styles.modeTextActive]}>간격 반복</Text>
              </Pressable>
              <Pressable
                style={[styles.modeButton, draftSettings.scheduleMode === "fixed" && { backgroundColor: theme.tint }]}
                onPress={() => {
                  Keyboard.dismiss();
                  setDraftSettings({ ...draftSettings, scheduleMode: "fixed" });
                }}
              >
                <Text style={[styles.modeText, draftSettings.scheduleMode === "fixed" && styles.modeTextActive]}>특정 시간</Text>
              </Pressable>
            </View>

            {draftSettings.scheduleMode === "fixed" ? (
              <>
                <Text style={styles.fieldLabel}>요일</Text>
                <View style={styles.weekdayRow}>
                  {weekdays.map((day) => {
                    const selected = draftSettings.weekdays.includes(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        style={[styles.weekdayChip, selected && { borderColor: theme.tint, backgroundColor: theme.soft }]}
                        onPress={() => {
                          const nextWeekdays = selected
                            ? draftSettings.weekdays.filter((weekday) => weekday !== day.value)
                            : [...draftSettings.weekdays, day.value].sort((a, b) => a - b);
                          setDraftSettings({ ...draftSettings, weekdays: nextWeekdays.length ? nextWeekdays : [day.value] });
                        }}
                      >
                        <Text style={[styles.weekdayText, selected && { color: theme.tint }]}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.timeHeader}>
                  <Text style={styles.fieldLabel}>시간</Text>
                  <Pressable
                    disabled={draftSettings.fixedTimes.length >= 5}
                    style={[styles.addTimeButton, { backgroundColor: theme.soft }, draftSettings.fixedTimes.length >= 5 && styles.disabledButton]}
                    onPress={() => setDraftSettings({ ...draftSettings, fixedTimes: [...draftSettings.fixedTimes, "22:00"] })}
                  >
                    <Text style={[styles.addTimeText, { color: theme.tint }]}>+ 추가</Text>
                  </Pressable>
                </View>
                {draftSettings.fixedTimes.map((time, index) => (
                  <View key={index} style={[styles.fixedTimeBlock, { borderColor: theme.border }]}>
                    <View style={styles.timeHeader}>
                      <Text style={styles.fieldLabel}>시간 {index + 1}</Text>
                      <Pressable
                        disabled={draftSettings.fixedTimes.length <= 1}
                        style={[styles.removeTimeButton, draftSettings.fixedTimes.length <= 1 && styles.disabledButton]}
                        onPress={() => setDraftSettings({ ...draftSettings, fixedTimes: draftSettings.fixedTimes.filter((_, itemIndex) => itemIndex !== index) })}
                      >
                        <Text style={styles.removeTimeText}>삭제</Text>
                      </Pressable>
                    </View>
                    <TimeWheel
                      value={time}
                      onChange={(value) => {
                        setDraftSettings((current) => {
                          const nextTimes = [...current.fixedTimes];
                          nextTimes[index] = value;
                          return { ...current, fixedTimes: nextTimes };
                        });
                      }}
                    />
                  </View>
                ))}
              </>
            ) : (
              <>
                <TimeWheel label="시작" value={draftSettings.startTime} onChange={(startTime) => setDraftSettings((current) => ({ ...current, startTime }))} />
                <TimeWheel label="방해금지 시작" value={draftSettings.dndStart} onChange={(dndStart) => setDraftSettings((current) => ({ ...current, dndStart }))} />
                <TimeWheel label="방해금지 종료" value={draftSettings.dndEnd} onChange={(dndEnd) => setDraftSettings((current) => ({ ...current, dndEnd }))} />
                <IntervalWheel
                  value={draftSettings.intervalMinutes}
                  onChange={(intervalMinutes) => {
                    Keyboard.dismiss();
                    setDraftSettings((current) => ({ ...current, intervalMinutes }));
                  }}
                />
              </>
            )}
          </>
        ) : null}
        {draftSettings.enabled && editing ? (
          <View style={styles.simulationBox}>
            <Text style={styles.simulationLabel}>이렇게 저장하면</Text>
            <Text style={[styles.simulationText, { color: theme.tint }]}>{draftSummary.countText}</Text>
          </View>
        ) : null}
        {validationError ? <Text style={styles.failedNotice}>{validationError}</Text> : null}
        {draftSettings.enabled && editing ? (
          <Pressable
            disabled={saveState === "saving"}
            style={[
              styles.save,
              { backgroundColor: saveState === "saved" ? "#3fb565" : saveState === "failed" ? "#d92d20" : theme.tint },
              saveState === "saving" && styles.savePending
            ]}
            onPress={() => {
              Keyboard.dismiss();
              void handleSave();
            }}
          >
            <Text style={styles.saveText}>
              {saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장 완료" : saveState === "failed" ? "저장 실패" : "저장"}
            </Text>
          </Pressable>
        ) : null}
        {saveState === "saved" && adjustedNotice ? (
          <Text style={[styles.savedNotice, { color: theme.tint }]}>{adjustedNotice}</Text>
        ) : null}
        {saveState === "failed" ? (
          <Text style={styles.failedNotice}>저장하지 못했어. 네트워크나 로그인 상태를 확인해줘.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

function TimeWheel({
  label,
  value,
  onChange
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useAppTheme();
  const normalized = normalizeTimeText(value) || "00:00";
  const [hour, minute] = normalized.split(":").map(Number);

  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.timeWheel, { borderColor: theme.border }]}>
        <WheelColumn
          options={hourOptions}
          value={hour}
          suffix="시"
          onChange={(nextHour) => onChange(`${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}
        />
        <View style={[styles.timeWheelDivider, { backgroundColor: theme.border }]} />
        <WheelColumn
          options={minuteOptions}
          value={minute}
          suffix="분"
          onChange={(nextMinute) => onChange(`${String(hour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`)}
        />
      </View>
    </View>
  );
}

function WheelColumn({
  options,
  value,
  suffix,
  onChange
}: {
  options: number[];
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const theme = useAppTheme();
  const wheelRef = useRef<ScrollView | null>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));

  useEffect(() => {
    requestAnimationFrame(() => {
      wheelRef.current?.scrollTo({ y: selectedIndex * TIME_WHEEL_ITEM_HEIGHT, animated: false });
    });
  }, [selectedIndex]);

  const selectFromScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(0, Math.min(options.length - 1, Math.round(event.nativeEvent.contentOffset.y / TIME_WHEEL_ITEM_HEIGHT)));
    const nextValue = options[nextIndex];
    if (nextValue !== value) onChange(nextValue);
  };

  return (
    <ScrollView
      ref={wheelRef}
      style={styles.timeWheelColumn}
      contentContainerStyle={styles.timeWheelColumnContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      snapToInterval={TIME_WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={selectFromScroll}
      onScrollEndDrag={(event) => {
        if (Math.abs(event.nativeEvent.velocity?.y || 0) < 0.1) selectFromScroll(event);
      }}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            style={[styles.timeWheelOption, selected && { backgroundColor: theme.soft }]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.timeWheelOptionText, selected && { color: theme.tint, fontSize: 19 }]}>
              {String(option).padStart(2, "0")}{suffix}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function IntervalWheel({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useAppTheme();
  const wheelRef = useRef<ScrollView | null>(null);
  const selectedValue = normalizeIntervalMinutes(value);
  const selectedIndex = Math.max(0, intervalOptions.indexOf(selectedValue));

  useEffect(() => {
    requestAnimationFrame(() => {
      wheelRef.current?.scrollTo({ y: Math.max(0, selectedIndex * 48 - 48), animated: false });
    });
  }, [selectedIndex]);

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>알림 간격(분)</Text>
      </View>
      <ScrollView
        ref={wheelRef}
        style={[styles.intervalWheel, { borderColor: theme.border }]}
        contentContainerStyle={styles.intervalWheelContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {intervalOptions.map((option) => {
          const selected = option === selectedValue;
          return (
            <Pressable
              key={option}
              style={[styles.intervalOption, selected && { backgroundColor: theme.soft }]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.intervalOptionText, selected && { color: theme.tint, fontSize: 20 }]}>
                {option}분
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function normalizeNotificationSettings(settings: NotificationSettings): NotificationSettings {
  const fixedTimes = (settings.fixedTimes?.length ? settings.fixedTimes : ["10:00"])
    .map((time) => normalizeTimeText(time))
    .filter((time): time is string => Boolean(time))
    .slice(0, 5);
  return {
    ...settings,
    intervalMinutes: normalizeIntervalMinutes(settings.intervalMinutes),
    weekdays: settings.weekdays?.length ? settings.weekdays.filter((day) => day >= 1 && day <= 7) : [1, 2, 3, 4, 5, 6, 7],
    fixedTimes: fixedTimes.length ? fixedTimes : ["10:00"]
  };
}

function normalizeTimeText(value: string) {
  const digits = timeDigits(value);
  if (digits.length !== 3 && digits.length !== 4) return null;
  const padded = digits.padStart(4, "0");
  const hour = Number(padded.slice(0, 2));
  const minute = Number(padded.slice(2));
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function validateNotificationSettings(settings: NotificationSettings) {
  if (!settings.enabled) return null;

  if (settings.scheduleMode === "fixed") {
    if (!settings.weekdays.length) return "요일을 하나 이상 골라줘.";
    if (!settings.fixedTimes.length) return "알림 시간을 하나 이상 입력해줘.";
    if (settings.fixedTimes.some((time) => !normalizeTimeText(time))) {
      return "특정 시간을 다시 선택해줘.";
    }
    return null;
  }

  if (!normalizeTimeText(settings.startTime)) return "시작 시간을 다시 선택해줘.";
  if (!normalizeTimeText(settings.dndStart)) return "방해금지 시작 시간을 다시 선택해줘.";
  if (!normalizeTimeText(settings.dndEnd)) return "방해금지 종료 시간을 다시 선택해줘.";
  const start = parseTime(settings.startTime);
  const dndStart = parseTime(settings.dndStart);
  const dndEnd = parseTime(settings.dndEnd);
  if (start !== null && dndStart !== null && dndEnd !== null && isInDnd(start, dndStart, dndEnd)) {
    return "시작 시간이 방해금지 시간 안에 있어.\n시작 시간이나 방해금지 시간을 조정해줘.";
  }
  return null;
}

function normalizeIntervalMinutes(value: number) {
  const clamped = Math.max(MIN_INTERVAL_MINUTES, Math.min(MAX_INTERVAL_MINUTES, Number(value) || MAX_INTERVAL_MINUTES));
  return Math.round((clamped - MIN_INTERVAL_MINUTES) / INTERVAL_STEP_MINUTES) * INTERVAL_STEP_MINUTES + MIN_INTERVAL_MINUTES;
}

function parseTime(value: string) {
  const normalized = normalizeTimeText(value);
  if (!normalized) return null;
  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

function isInDnd(minuteOfDay: number, dndStart: number, dndEnd: number) {
  if (dndStart === dndEnd) return false;
  if (dndStart < dndEnd) return minuteOfDay >= dndStart && minuteOfDay < dndEnd;
  return minuteOfDay >= dndStart || minuteOfDay < dndEnd;
}

function getIntervalCount(settings: NotificationSettings) {
  const start = parseTime(settings.startTime);
  const dndStart = parseTime(settings.dndStart);
  const dndEnd = parseTime(settings.dndEnd);
  const interval = normalizeIntervalMinutes(settings.intervalMinutes);
  if (start === null || dndStart === null || dndEnd === null) return 0;

  let count = 0;
  for (let minute = start; minute < 24 * 60 && count < 12; minute += interval) {
    if (!isInDnd(minute, dndStart, dndEnd)) count += 1;
  }
  return count;
}

function formatTime(value: string) {
  const normalized = normalizeTimeText(value);
  if (!normalized) return value;
  const [hour, minute] = normalized.split(":").map(Number);
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;
  return minute ? `${period} ${displayHour}시 ${minute}분` : `${period} ${displayHour}시`;
}

function getNotificationSummary(settings: NotificationSettings) {
  const normalized = normalizeNotificationSettings(settings);
  if (normalized.scheduleMode === "fixed") {
    const selectedDays = weekdays
      .filter((day) => normalized.weekdays.includes(day.value))
      .map((day) => day.label)
      .join(", ");
    const fixedTimes = normalized.fixedTimes.map(formatTime).join(", ");
    const count = normalized.weekdays.length * normalized.fixedTimes.length;
    return {
      lines: [
        "방식 · 특정 시간",
        `요일 · ${selectedDays}`,
        `시간 · ${fixedTimes}`
      ],
      countText: `일주일에 ${count}번의 기록을 할 수 있어`
    };
  }

  const count = getIntervalCount(normalized);
  return {
    lines: [
      "방식 · 간격 반복",
      `시작 · ${formatTime(normalized.startTime)}`,
      `간격 · ${normalized.intervalMinutes}분마다`,
      `방해금지 · ${formatTime(normalized.dndStart)} ~ ${formatTime(normalized.dndEnd)}`
    ],
    countText: `하루에 ${count}번의 기록을 할 수 있어`
  };
}

const styles = StyleSheet.create({
  panel: {
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  switchWrap: {
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionTitle: {
    color: "#18241b",
    fontSize: 16,
    fontWeight: "900"
  },
  status: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "800"
  },
  summaryBox: {
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  summaryTitle: {
    flex: 1,
    color: "#18241b",
    fontSize: 15,
    fontWeight: "900"
  },
  summaryLine: {
    color: "#657064",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  summaryCount: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900"
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  changeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900"
  },
  field: {
    gap: 6
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  fieldLabel: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "900"
  },
  timeWheel: {
    height: TIME_WHEEL_ITEM_HEIGHT * 3 + 2,
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff"
  },
  timeWheelColumn: {
    flex: 1
  },
  timeWheelColumnContent: {
    paddingVertical: TIME_WHEEL_ITEM_HEIGHT
  },
  timeWheelDivider: {
    width: 1
  },
  timeWheelOption: {
    height: TIME_WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center"
  },
  timeWheelOptionText: {
    color: "#657064",
    fontSize: 15,
    fontWeight: "900"
  },
  intervalWheel: {
    maxHeight: 168,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  intervalWheelContent: {
    gap: 6,
    padding: 8
  },
  intervalOption: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8
  },
  intervalOptionText: {
    color: "#657064",
    fontSize: 16,
    fontWeight: "900"
  },
  modeSwitch: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    borderRadius: 8
  },
  modeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 7
  },
  modeText: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "900"
  },
  modeTextActive: {
    color: "#fff"
  },
  weekdayRow: {
    flexDirection: "row",
    gap: 6
  },
  weekdayChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  weekdayText: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "900"
  },
  timeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  addTimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  addTimeText: {
    fontSize: 13,
    fontWeight: "900"
  },
  fixedTimeBlock: {
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  removeTimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  removeTimeText: {
    color: "#d92d20",
    fontSize: 13,
    fontWeight: "900"
  },
  disabledButton: {
    opacity: 0.35
  },
  simulationBox: {
    gap: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff"
  },
  simulationLabel: {
    color: "#98a294",
    fontSize: 12,
    fontWeight: "900"
  },
  simulationText: {
    fontSize: 14,
    fontWeight: "900"
  },
  save: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: "#18241b"
  },
  savePending: {
    opacity: 0.68
  },
  saveText: {
    color: "#fff",
    fontWeight: "900"
  },
  savedNotice: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900"
  },
  failedNotice: {
    color: "#d92d20",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900"
  }
});
