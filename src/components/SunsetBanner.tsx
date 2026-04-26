"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";

interface SunsetBannerContextValue {
  visible: boolean;
  dismiss: () => void;
}

const SunsetBannerContext = createContext<SunsetBannerContextValue>({
  visible: false,
  dismiss: () => {},
});

const STORAGE_KEY = "schematic_sunset_banner_dismissed_v1";

export function SunsetBannerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <SunsetBannerContext.Provider value={{ visible, dismiss }}>
      {children}
    </SunsetBannerContext.Provider>
  );
}

export function useSunsetBanner() {
  return useContext(SunsetBannerContext);
}

export default function SunsetBanner() {
  const { visible, dismiss } = useSunsetBanner();
  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[60] h-10 flex items-center justify-center px-10 bg-amber-500 text-amber-950 text-xs sm:text-sm font-medium shadow-md"
    >
      <p className="text-center leading-tight truncate">
        <span className="font-semibold">Schematic is sunsetting.</span>{" "}
        <span className="hidden sm:inline">
          schematic.now expires May 5, 2026 — switch to{" "}
        </span>
        <span className="sm:hidden">Visit </span>
        <a
          href="https://schematicnow.vercel.app"
          className="underline font-semibold hover:text-amber-900"
        >
          schematicnow.vercel.app
        </a>
        <span className="hidden sm:inline"> to keep using Schematic.</span>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss sunset notice"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-amber-600/40 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
