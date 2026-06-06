import { EnergyColorMode } from "../types/domain";

export type EnergyColorLevel = {
  value: number;
  color: string;
  glow: string;
  textColor: string;
};

export const energyPalettes: Record<EnergyColorMode, { label: string; levels: EnergyColorLevel[] }> = {
  soft: {
    label: "부드러운 색",
    levels: [
      { value: 1, color: "#b8beb9", glow: "rgba(85, 85, 85, 0.22)", textColor: "#fff" },
      { value: 2, color: "#ff9b93", glow: "rgba(255, 77, 79, 0.2)", textColor: "#fff" },
      { value: 3, color: "#ffe681", glow: "rgba(255, 196, 0, 0.26)", textColor: "#263329" },
      { value: 4, color: "#9ee6b7", glow: "rgba(25, 184, 90, 0.2)", textColor: "#fff" },
      { value: 5, color: "#9fc5ff", glow: "rgba(30, 139, 255, 0.2)", textColor: "#fff" }
    ]
  },
  vivid: {
    label: "선명한 색",
    levels: [
      { value: 1, color: "#9a9a9a", glow: "rgba(85, 85, 85, 0.22)", textColor: "#fff" },
      { value: 2, color: "#ff4d4f", glow: "rgba(255, 77, 79, 0.24)", textColor: "#fff" },
      { value: 3, color: "#ffc400", glow: "rgba(255, 196, 0, 0.3)", textColor: "#263329" },
      { value: 4, color: "#19b85a", glow: "rgba(25, 184, 90, 0.24)", textColor: "#fff" },
      { value: 5, color: "#1e8bff", glow: "rgba(30, 139, 255, 0.24)", textColor: "#fff" }
    ]
  }
};

export function getEnergyLevel(mode: EnergyColorMode, value: number) {
  return energyPalettes[mode].levels.find((level) => level.value === value) || energyPalettes[mode].levels[2];
}
