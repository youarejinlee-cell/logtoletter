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
  const leaf = size * 0.5;
  const top = size * 0.12;
  const sideTop = size * 0.43;
  const left = size * 0.08 - 1;
  const right = size * 0.42 + 1;
  const borderLeaf = leaf + 4;

  return (
    <View style={[styles.wrap, { width: size, height: size, opacity: disabled ? 0.45 : 1 }]}>
      {selected && borderColor ? (
        <View style={[styles.borderLayer, { width: size, height: size }]}>
          <Leaf size={borderLeaf} color={borderColor} top={top - 2} left={(size - borderLeaf) / 2} />
          <Leaf size={borderLeaf} color={borderColor} top={sideTop - 2} left={left - 2} />
          <Leaf size={borderLeaf} color={borderColor} top={sideTop - 2} left={right - 2} />
        </View>
      ) : null}
      <Leaf size={leaf} color={color} top={top} left={(size - leaf) / 2} shadowColor={glowColor} shadowOpacity={shadowOpacity} />
      <Leaf size={leaf} color={color} top={sideTop} left={left} shadowColor={glowColor} shadowOpacity={shadowOpacity} />
      <Leaf size={leaf} color={color} top={sideTop} left={right} shadowColor={glowColor} shadowOpacity={shadowOpacity} />
      {label ? <Text style={[styles.label, { color: textColor, fontSize: size * 0.31 }]}>{label}</Text> : null}
    </View>
  );
}

function Leaf({
  size,
  color,
  top,
  left,
  shadowColor,
  borderColor,
  shadowOpacity = 0.45
}: {
  size: number;
  color: string;
  top: number;
  left: number;
  shadowColor?: string;
  borderColor?: string;
  shadowOpacity?: number;
}) {
  return (
    <View
      style={[
        styles.leaf,
        {
          width: size,
          height: size,
          top,
          left,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: shadowColor || color,
          shadowOpacity,
          borderWidth: borderColor ? 2 : 0,
          borderColor
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  borderLayer: {
    position: "absolute",
    top: 0,
    left: 0
  },
  leaf: {
    position: "absolute",
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  label: {
    zIndex: 3,
    marginTop: 4,
    fontWeight: "900",
    textAlign: "center"
  }
});
