import { useEffect } from "react";
import { isPrimaryModifierPressed } from "./platform";

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
  target?: EventTarget | null;
  // When true, uses Cmd on macOS and Ctrl on Windows/Linux
  primaryKey?: boolean;
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
        primaryKey = false,
      } = options;

      // Check if the key combination matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatches = primaryKey
        ? isPrimaryModifierPressed(event)
        : event.ctrlKey === ctrlKey;
      const metaMatches = primaryKey ? true : event.metaKey === metaKey;
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
    options.primaryKey,
    callback,
    ...dependencies,
  ]);
}

// Predefined shortcuts
export const useSearchShortcut = (callback: () => void) => {
  useKeyboardShortcut({ key: "k", primaryKey: true }, callback);
};

export const useEscapeShortcut = (callback: () => void) => {
  useKeyboardShortcut({ key: "Escape" }, callback);
};
