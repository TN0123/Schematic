"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 dark:bg-dark-secondary hover:bg-gray-300 dark:hover:bg-dark-hover transition-all duration-200"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <Sun className="w-3 h-3 text-gray-300" />
      ) : (
        <Moon className="w-3 h-3 text-gray-600" />
      )}
    </button>
  );
}
