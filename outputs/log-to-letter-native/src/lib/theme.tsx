import { createContext, PropsWithChildren, useContext } from "react";
import { ColorTheme } from "../types/domain";

export type AppTheme = {
  label: string;
  tint: string;
  soft: string;
  page: string;
  border: string;
};

export const themePalettes: Record<ColorTheme, AppTheme> = {
  red: { label: "빨강", tint: "#e4564f", soft: "#ffe8e5", page: "#fff7f6", border: "#f2c9c5" },
  yellow: { label: "노랑", tint: "#d79b13", soft: "#fff4c7", page: "#fffaf0", border: "#ecdca4" },
  green: { label: "초록", tint: "#2f8f54", soft: "#e7f6df", page: "#f5f8f1", border: "#dfe8da" },
  blue: { label: "파랑", tint: "#3478d4", soft: "#e4efff", page: "#f5f9ff", border: "#d6e3f5" }
};

const ThemeContext = createContext<AppTheme>(themePalettes.green);

export function AppThemeProvider({ theme, children }: PropsWithChildren<{ theme: AppTheme }>) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
