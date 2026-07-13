import { StyleSheet, Text, View } from "react-native";

type Props = {
  color: string;
  label?: string;
  size?: number;
  textColor?: string;
  selected?: boolean;
  disabled?: boolean;
  glowColor?: string;
  borderColor?: string;
  shadowOpacity?: number;
};

export function CloverBadge({
  color,
  label = "",
  size = 44,
  textColor = "#263329",
  selected,
  disabled,
  glowColor = "rgba(34, 95, 48, 0.18)",
  borderColor,
  shadowOpacity = 0.45
}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: selected && borderColor ? borderColor : "transparent",
          shadowColor: glowColor,
          shadowOpacity,
          opacity: disabled ? 0.45 : 1
        },
        selected && borderColor ? styles.selected : null
      ]}
    >
      {label ? <Text style={[styles.label, { color: textColor, fontSize: size * 0.31 }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  selected: {
    borderWidth: 3
  },
  label: {
    fontWeight: "900",
    textAlign: "center"
  }
});
