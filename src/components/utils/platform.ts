import { useEffect, useState } from "react";

export function getModifierKeyLabel(): "Cmd" | "Ctrl" {
  if (typeof window === "undefined") return "Ctrl";
  const ua = navigator.userAgent || navigator.vendor || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";
  const isMac = /Mac|Macintosh|Mac OS/i.test(ua) || /Mac/i.test(platform);
  return isMac ? "Cmd" : "Ctrl";
}

export function useModifierKeyLabel(): "Cmd" | "Ctrl" {
  const [label, setLabel] = useState<"Cmd" | "Ctrl">("Ctrl");
  useEffect(() => {
    setLabel(getModifierKeyLabel());
  }, []);
  return label;
}

// Runtime platform detection helpers
export function isMacPlatform(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";
  return /Mac|Macintosh|Mac OS/i.test(ua) || /Mac/i.test(platform);
}

// Checks if the primary modifier is pressed for the current platform
export function isPrimaryModifierPressed(event: KeyboardEvent): boolean {
  return isMacPlatform() ? event.metaKey === true : event.ctrlKey === true;
}


// Mobile detection utilities
export function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  const platform =
    (navigator as any).userAgentData?.platform || navigator.platform || "";
  const uaDataMobile = (navigator as any).userAgentData?.mobile === true;
  const touchPointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  // Common mobile identifiers including tablets
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(ua) || /iPad|iPhone|iPod/i.test(platform);

  return Boolean(uaDataMobile || touchPointer || isMobileUA);
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(isMobileBrowser());
  }, []);
  return isMobile;
}

