"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type WriteViewMode = "diff" | "changeHandler";

interface WriteSettingsContextType {
  viewMode: WriteViewMode;
  setViewMode: (mode: WriteViewMode) => void;
}

const WriteSettingsContext = createContext<
  WriteSettingsContextType | undefined
>(undefined);

const STORAGE_KEY = "writeViewMode";
const DEFAULT_MODE: WriteViewMode = "diff";

export function WriteSettingsProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<WriteViewMode>(DEFAULT_MODE);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(
          STORAGE_KEY
        ) as WriteViewMode | null;
        if (stored === "diff" || stored === "changeHandler") {
          setViewModeState(stored);
        }
      } catch (error) {
        console.error("Failed to load write view mode:", error);
      }
    }
  }, []);

  const setViewMode = (mode: WriteViewMode) => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch (error) {
        console.error("Failed to save write view mode:", error);
      }
    }
  };

  // Don't render children until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <WriteSettingsContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </WriteSettingsContext.Provider>
  );
}

export function useWriteSettings() {
  const context = useContext(WriteSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useWriteSettings must be used within a WriteSettingsProvider"
    );
  }
  return context;
}
