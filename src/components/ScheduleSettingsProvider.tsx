"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface ScheduleSettingsContextType {
  suggestionsEnabled: boolean;
  setSuggestionsEnabled: (enabled: boolean) => void;
}

const ScheduleSettingsContext = createContext<
  ScheduleSettingsContextType | undefined
>(undefined);

const STORAGE_KEY = "scheduleSuggestionsEnabled";
const DEFAULT_ENABLED = true;

export function ScheduleSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [suggestionsEnabled, setSuggestionsEnabledState] =
    useState<boolean>(DEFAULT_ENABLED);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setSuggestionsEnabledState(stored === "true");
        }
      } catch (error) {
        console.error("Failed to load schedule suggestions setting:", error);
      }
    }
  }, []);

  const setSuggestionsEnabled = (enabled: boolean) => {
    setSuggestionsEnabledState(enabled);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, enabled.toString());
      } catch (error) {
        console.error("Failed to save schedule suggestions setting:", error);
      }
    }
  };

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <ScheduleSettingsContext.Provider
      value={{ suggestionsEnabled, setSuggestionsEnabled }}
    >
      {children}
    </ScheduleSettingsContext.Provider>
  );
}

export function useScheduleSettings() {
  const context = useContext(ScheduleSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useScheduleSettings must be used within a ScheduleSettingsProvider"
    );
  }
  return context;
}
