"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { Moon, Sun } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-start h-screen pt-24 bg-gray-50 dark:bg-dark-background transition-all">
      <div className="py-6">
        <h1 className="text-4xl text-center font-bold text-gray-900 dark:text-dark-textPrimary mb-8">
          Settings
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-dark-textSecondary mb-12">
          Manage your preferences here.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center border-2 border-gray-200 dark:border-dark-divider w-1/2 p-2 rounded-xl">
        <span className="flex w-full justify-between items-center px-4">
          Theme
          <span className="flex items-center gap-2">
            <Moon className="dark:text-dark-textSecondary" />
            <ThemeToggle />
            <Sun className="text-yellow-600 dark:text-yellow-400" />
          </span>
        </span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/login" })}
        className="mt-8 px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors duration-200"
      >
        Sign Out
      </button>
    </div>
  );
}
