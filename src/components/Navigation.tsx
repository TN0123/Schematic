"use client";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  PenLine,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Search,
} from "lucide-react";
import { TransitionLink } from "./utils/TransitionLink";
import { useSearch } from "./SearchProvider";

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { openSearch } = useSearch();

  // Don't show navigation on login page
  if (pathname === "/auth/login") return null;

  const navItems = [
    { href: "/write", icon: PenLine, label: "Write" },
    { href: "/bulletin", icon: ClipboardList, label: "Bulletin" },
    { href: "/schedule", icon: Calendar, label: "Schedule" },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-16 bg-white shadow-sm border-r border-gray-100 dark:bg-dark-background dark:border-dark-divider flex flex-col items-center py-4 z-50">
      <TransitionLink
        href="/"
        className="flex items-center justify-center mb-6"
      >
        <img
          src="/favicon.ico"
          alt="Logo"
          className="w-8 h-8 drop-shadow-[0_0px_5px_rgba(0,0,0,0.25)] dark:drop-shadow-none transition-all duration-300"
        />
      </TransitionLink>

      <div className="flex flex-col items-center gap-6 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? "bg-gray-100 text-gray-600 dark:bg-dark-secondary dark:text-dark-textPrimary"
                  : "text-gray-600 hover:bg-gray-100 dark:text-dark-textSecondary dark:hover:bg-dark-hover"
              }`}
            >
              <Icon className="w-6 h-6" />
            </TransitionLink>
          );
        })}

        {/* Search Button */}
        <button
          onClick={openSearch}
          className="p-2 rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-100 dark:text-dark-textSecondary dark:hover:bg-dark-hover mb-6"
          title="Search (Ctrl+K)"
        >
          <Search className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 mt-auto">
        {session && (
          <>
            <TransitionLink
              href="/settings"
              className={`p-2 rounded-lg transition-colors duration-200 ${
                pathname === "/settings"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-dark-textSecondary dark:hover:bg-dark-hover"
              }`}
            >
              <Settings className="w-6 h-6" />
            </TransitionLink>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-dark-textSecondary dark:hover:bg-dark-hover transition-colors duration-200"
              title="Sign Out"
            >
              <LogOut className="w-6 h-6" />
            </button>
            <div className="mt-2">
              <Image
                width={32}
                height={32}
                src={session.user?.image || "/default-avatar.png"}
                alt="Profile"
                className="rounded-full border border-gray-300 dark:border-dark-divider"
              />
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
