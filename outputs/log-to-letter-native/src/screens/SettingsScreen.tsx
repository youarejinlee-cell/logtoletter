import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { useAppTheme } from "../lib/theme";
import { NotificationSettings } from "../types/domain";

type Props = {
  settings: NotificationSettings;
  notificationStatus?: string | null;
  onChange: (settings: NotificationSettings) => void;
};

export function SettingsScreen({ settings, notificationStatus, onChange }: Props) {
  const theme = useAppTheme();

  return (
    <Screen
      eyebrow="NOTIFICATION"
      title="기록 알림 설정"
      lead="순간의 생각을 기록할 수 있도록 앱 푸시를 보내줄게."
    >
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>알림 설정</Text>
        {notificationStatus ? <Text style={styles.status}>예약 상태 · {notificationStatus}</Text> : null}
        <View style={styles.row}>
          <Text style={styles.label}>알림</Text>
          <View style={styles.switchWrap}>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => onChange({ ...settings, enabled })}
              trackColor={{ false: "#e68a8a", true: "#8ed08b" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {settings.enabled ? (
          <>
            <Field label="시작" value={settings.startTime} onChangeText={(startTime) => onChange({ ...settings, startTime })} />
            <Field label="방해금지 시작" value={settings.dndStart} onChangeText={(dndStart) => onChange({ ...settings, dndStart })} />
            <Field label="방해금지 종료" value={settings.dndEnd} onChangeText={(dndEnd) => onChange({ ...settings, dndEnd })} />
            <Field
              label="알림 간격(분)"
              value={String(settings.intervalMinutes)}
              keyboardType="number-pad"
              onChangeText={(value) => onChange({ ...settings, intervalMinutes: Number(value) || 120 })}
            />
            <Pressable style={[styles.save, { backgroundColor: theme.tint }]}>
              <Text style={styles.saveText}>저장</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Field({
  label,
  value,
  keyboardType,
  onChangeText
}: {
  label: string;
  value: string;
  keyboardType?: "number-pad";
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={styles.input} />
    </View>
  );
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  switchWrap: {
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    color: "#18241b",
    fontSize: 18,
    fontWeight: "900"
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
  field: {
    gap: 6
  },
  fieldLabel: {
    color: "#657064",
    fontSize: 13,
    fontWeight: "900"
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#dfe8da",
    borderRadius: 8,
    color: "#18241b"
  },
  save: {
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: "#18241b"
  },
  saveText: {
    color: "#fff",
    fontWeight: "900"
  }
});
