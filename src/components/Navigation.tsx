"use client";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { Menu } from "lucide-react";
import { TransitionLink } from "./utils/TransitionLink";

export default function Navigation() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-gray-100 dark:bg-dark-background dark:border-dark-divider">
      <div className="w-full px-4 py-3">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center justify-center gap-4 px-4 py-2">
            <TransitionLink
              href="/"
              className="flex items-center justify-center text-xl font-bold text-black dark:text-white"
            >
              <img
                src="/favicon.ico"
                alt="Logo"
                className="w-6 h-6 mr-2 mt-[0.1rem] drop-shadow-[0_0px_5px_rgba(0,0,0,0.25)] dark:drop-shadow-none transition-all duration-300"
              />
              Schematic
              <span className="ml-2 px-2 py-1 mt-1 text-xs font-semibold text-white text-center bg-blue-500 rounded-full">
                BETA
              </span>
            </TransitionLink>
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
                  <TransitionLink
                    href="/write"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Write
                  </TransitionLink>
                </li>
                <li className="block md:inline-block px-4 py-2 md:p-0 text-right">
                  <TransitionLink
                    href="/bulletin"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Bulletin
                  </TransitionLink>
                </li>
                <li className="block md:inline-block px-4 py-2 md:p-0 text-right">
                  <TransitionLink
                    href="/schedule"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Schedule
                  </TransitionLink>
                </li>
                <li className="block md:inline-block px-4 py-2 md:p-0">
                  <TransitionLink
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
                  </TransitionLink>
                </li>
              </>
            ) : (
              <li className="block md:inline-block px-4 py-2 md:p-0">
                <TransitionLink
                  href="/auth/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                >
                  Sign In
                </TransitionLink>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
