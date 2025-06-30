import { useEffect } from "react";

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
  target?: EventTarget | null;
}

export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: (event: KeyboardEvent) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        key,
        ctrlKey = false,
        metaKey = false,
        shiftKey = false,
        altKey = false,
        preventDefault = true,
      } = options;

      // Check if the key combination matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatches = event.ctrlKey === ctrlKey;
      const metaMatches = event.metaKey === metaKey;
      const shiftMatches = event.shiftKey === shiftKey;
      const altMatches = event.altKey === altKey;

      if (
        keyMatches &&
        ctrlMatches &&
        metaMatches &&
        shiftMatches &&
        altMatches
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    const target = options.target || document;
    target.addEventListener("keydown", handleKeyDown as EventListener);

    return () => {
      target.removeEventListener("keydown", handleKeyDown as EventListener);
    };
  }, [
    options.key,
    options.ctrlKey,
    options.metaKey,
    options.shiftKey,
    options.altKey,
    callback,
    ...dependencies,
  ]);
}

// Predefined shortcuts
export const useSearchShortcut = (callback: () => void) => {
  useKeyboardShortcut({ key: "k", ctrlKey: true, metaKey: true }, callback);
};

export const useEscapeShortcut = (callback: () => void) => {
  useKeyboardShortcut({ key: "Escape" }, callback);
};
