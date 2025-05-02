"use client";

import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={theme === "dark"}
        onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 dark:bg-dark-secondary rounded-full peer peer-checked:bg-dark-hover transition-all duration-200"></div>
      <span
        className={`absolute left-1 top-1 w-4 h-4 bg-white dark:bg-gray-300 rounded-full transition-transform duration-200 ${
          theme === "dark" ? "translate-x-5" : ""
        }`}
      ></span>
    </label>
  );
}
