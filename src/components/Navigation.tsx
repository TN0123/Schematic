"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-gray-100 dark:bg-dark-background dark:border-dark-divider">
      <div className="w-full px-4 py-3">
        <div className="flex w-full justify-between items-center">
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/"
              className="flex items-center justify-center text-xl font-bold text-black dark:text-dark-textPrimary"
            >
              <img
                src="/favicon.ico"
                alt="Logo"
                className="w-6 h-6 mr-2 mt-[0.1rem]"
              />
              Schematic
            </Link>
          </div>
          <ul className="flex items-center gap-8">
            {session ? (
              <>
                <li>
                  <Link
                    href="/write"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Write
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bulletin"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Bulletin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/schedule"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
                  >
                    Schedule
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
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
              <li>
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
