import { EnergyColorMode } from "../types/domain";

export type EnergyColorLevel = {
  value: number;
  color: string;
  glow: string;
  textColor: string;
};

type EnergyPalettePreset = {
  label: string;
  mixes: number[];
};

const presets: Record<EnergyColorMode, EnergyPalettePreset> = {
  soft: {
    label: "부드러운 색",
    mixes: [0.08, 0.14, 0.2, 0.27, 0.35, 0.44, 0.54, 0.64, 0.74, 0.84, 0.94]
  },
  vivid: {
    label: "선명한 색",
    mixes: [0.12, 0.2, 0.29, 0.38, 0.48, 0.58, 0.68, 0.78, 0.86, 0.94, 1]
  }
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mixWithWhite(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  return rgbToHex(
    255 - (255 - rgb.r) * amount,
    255 - (255 - rgb.g) * amount,
    255 - (255 - rgb.b) * amount
  );
}

function readableTextColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#263329" : "#fff";
}

export function getEnergyPalette(mode: EnergyColorMode, themeTint = "#2f8f54") {
  const preset = presets[mode];
  const tint = themeTint || "#2f8f54";
  return {
    label: preset.label,
    levels: preset.mixes.map((amount, index) => {
      const color = mixWithWhite(tint, amount);
      const { r, g, b } = hexToRgb(color);
      return {
        value: index * 10,
        color,
        glow: `rgba(${r}, ${g}, ${b}, ${mode === "soft" ? 0.18 : 0.24})`,
        textColor: readableTextColor(color)
      };
    })
  };
}

export const energyPalettes: Record<EnergyColorMode, { label: string; levels: EnergyColorLevel[] }> = {
  soft: getEnergyPalette("soft"),
  vivid: getEnergyPalette("vivid")
};

export function normalizeEnergyPercent(value: number) {
  if (value > 0 && value <= 7) {
    return Math.max(10, Math.min(100, Math.round((value / 7) * 10) * 10));
  }
  return Math.max(0, Math.min(100, Math.round(value / 10) * 10));
}

export function getEnergyLevel(mode: EnergyColorMode, value: number, themeTint = "#2f8f54") {
  const levels = getEnergyPalette(mode, themeTint).levels;
  const normalized = normalizeEnergyPercent(value);
  return levels.find((level) => level.value === normalized) || levels[5];
}
