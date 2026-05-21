import React, { createContext, useContext, useEffect, useState } from "react";
import {
  type PrimaryColor,
  normalizePrimaryColor,
  DEFAULT_CUSTOM_COLOR,
  applyAccentVariables,
  clearAccentVariables,
  hexToHslChannels,
} from "@/lib/brand-colors";

export type { PrimaryColor } from "@/lib/brand-colors";

type Theme = "dark" | "light";
export type FontSize = "compact" | "default" | "comfortable";

const BRAND_THEME_CLASSES = [
  "theme-brand-blue",
  "theme-brand-green",
  "theme-brand-red",
  "theme-brand-yellow",
] as const;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  customColor: string;
  setCustomColor: (hex: string) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
  primaryColor: "brand-blue",
  setPrimaryColor: () => {},
  customColor: DEFAULT_CUSTOM_COLOR,
  setCustomColor: () => {},
  fontSize: "default",
  setFontSize: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("nexus-theme") as Theme) || "dark";
    } catch {
      return "dark";
    }
  });

  const [primaryColor, setPrimaryColor] = useState<PrimaryColor>(() => {
    try {
      return normalizePrimaryColor(localStorage.getItem("nexus-primary-color"));
    } catch {
      return "brand-blue";
    }
  });

  const [customColor, setCustomColor] = useState<string>(() => {
    try {
      return localStorage.getItem("nexus-custom-color") || DEFAULT_CUSTOM_COLOR;
    } catch {
      return DEFAULT_CUSTOM_COLOR;
    }
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      return (localStorage.getItem("nexus-font-size") as FontSize) || "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("nexus-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark";

    root.classList.remove(...BRAND_THEME_CLASSES);
    clearAccentVariables(root);

    if (primaryColor === "custom") {
      applyAccentVariables(root, hexToHslChannels(customColor), isDark);
    } else {
      root.classList.add(`theme-${primaryColor}`);
    }

    try {
      localStorage.setItem("nexus-primary-color", primaryColor);
    } catch {
      /* ignore */
    }
  }, [primaryColor, customColor, theme]);

  useEffect(() => {
    try {
      localStorage.setItem("nexus-custom-color", customColor);
    } catch {
      /* ignore */
    }
  }, [customColor]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-compact", "text-comfortable");

    if (fontSize === "compact") {
      root.style.fontSize = "13px";
    } else if (fontSize === "comfortable") {
      root.style.fontSize = "17px";
    } else {
      root.style.fontSize = "15px";
    }

    try {
      localStorage.setItem("nexus-font-size", fontSize);
    } catch {
      /* ignore */
    }
  }, [fontSize]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        primaryColor,
        setPrimaryColor,
        customColor,
        setCustomColor,
        fontSize,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
