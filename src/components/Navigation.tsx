"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function Navigation() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-gray-100 dark:bg-dark-background dark:border-dark-divider">
      <div className="w-full px-4 py-3">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center justify-center gap-4 rounded-xl px-4 py-2 bg-gradient-to-r from-gray-700 via-gray-900 to-black dark:bg-dark-background dark:bg-none">
            <Link
              href="/"
              className="flex items-center justify-center text-xl font-bold text-white"
            >
              <img
                src="/favicon.ico"
                alt="Logo"
                className="w-6 h-6 mr-2 mt-[0.1rem] transition-all duration-300"
              />
              Schematic
              <span className="ml-2 px-2 py-1 mt-1 text-xs font-semibold text-white text-center bg-blue-500 rounded-full">
                BETA
              </span>
            </Link>
          </div>
          <button
            className="md:hidden text-gray-600 dark:text-dark-textSecondary focus:outline-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <ul
            className={`${
              isMenuOpen ? "block" : "hidden"
            } absolute top-16 right-0 w-1/4 rounded-xl bg-white dark:bg-dark-background md:static md:flex md:items-center md:gap-8 md:w-auto md:bg-transparent dark:md:bg-transparent z-40 transition-all duration-300`}
          >
            {session ? (
              <>
                <li className="block md:inline-block px-4 py-2 md:p-0 text-right">
                  <Link
                    href="/write"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Write
                  </Link>
                </li>
                <li className="block md:inline-block px-4 py-2 md:p-0 text-right">
                  <Link
                    href="/bulletin"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Bulletin
                  </Link>
                </li>
                <li className="block md:inline-block px-4 py-2 md:p-0 text-right">
                  <Link
                    href="/schedule"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Schedule
                  </Link>
                </li>
                <li className="block md:inline-block px-4 py-2 md:p-0">
                  <Link
                    href="/settings"
                    className="flex items-center justify-end text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    <Image
                      width={32}
                      height={32}
                      src={session.user?.image || "/default-avatar.png"}
                      alt="Profile"
                      className="rounded-full border border-gray-300 dark:border-dark-divider"
                    />
                  </Link>
                </li>
              </>
            ) : (
              <li className="block md:inline-block px-4 py-2 md:p-0">
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
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
