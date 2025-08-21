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


