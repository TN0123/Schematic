"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-black">
            Schematic
          </Link>
          <ul className="flex items-center gap-8">
            {session ? (
              <>
                <li>
                  <Link
                    href="/write"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Write
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bulletin"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Bulletin
                  </Link>
                </li>
                <li>
                  <Link
                    href="/schedule"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Schedule
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
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
