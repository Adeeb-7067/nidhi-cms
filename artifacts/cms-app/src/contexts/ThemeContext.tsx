import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
export type PrimaryColor = "default" | "blue" | "green" | "purple" | "orange" | "rose";
export type FontSize = "compact" | "default" | "comfortable";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  primaryColor: "default",
  setPrimaryColor: () => {},
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
      return (localStorage.getItem("nexus-primary-color") as PrimaryColor) || "default";
    } catch {
      return "default";
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
    
    // Remove all color classes
    root.classList.remove("theme-blue", "theme-green", "theme-purple", "theme-orange", "theme-rose");
    
    if (primaryColor !== "default") {
      root.classList.add(`theme-${primaryColor}`);
    }
    
    try {
      localStorage.setItem("nexus-primary-color", primaryColor);
    } catch {
      /* ignore */
    }
  }, [primaryColor]);

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all font size classes
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

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      primaryColor, 
      setPrimaryColor, 
      fontSize, 
      setFontSize 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
