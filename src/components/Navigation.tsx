"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
      <div className="w-full px-4 py-3">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="text-xl font-bold text-black dark:text-white"
            >
              Schematic
            </Link>
            <ThemeToggle />
          </div>
          <ul className="flex items-center gap-8">
            {session ? (
              <>
                <li>
                  <Link
                    href="/write"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-gray-300 dark:hover:text-white"
                  >
                    Write
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bulletin"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-gray-300 dark:hover:text-white"
                  >
                    Bulletin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/schedule"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-gray-300 dark:hover:text-white"
                  >
                    Schedule
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-gray-300 dark:hover:text-white"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-gray-300 dark:hover:text-white"
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
