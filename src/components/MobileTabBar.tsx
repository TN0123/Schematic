"use client";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  PenLine,
  ClipboardList,
  Calendar,
  Clock,
  Settings,
  LogOut,
  Search,
} from "lucide-react";
import { TransitionLink } from "./utils/TransitionLink";
import { useSearch } from "./SearchProvider";
import { useModifierKeyLabel } from "@/components/utils/platform";

export default function MobileTabBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { openSearch } = useSearch();
  const modKeyLabel = useModifierKeyLabel();

  // Don't show navigation on login page
  if (pathname === "/auth/login") return null;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/notebook", icon: PenLine, label: "Notebook" },
    { href: "/bulletin", icon: ClipboardList, label: "Bulletin" },
    { href: "/schedule", icon: Calendar, label: "Schedule" },
    { href: "/statistics", icon: Clock, label: "Statistics" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-200 dark:bg-dark-background/80 dark:border-dark-divider flex items-center justify-around z-50 md:hidden">
      {/* Main navigation items */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <TransitionLink
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-dark-textSecondary"
            }`}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </TransitionLink>
        );
      })}

      {/* Search button */}
      <button
        onClick={openSearch}
        className="flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 text-gray-600 dark:text-dark-textSecondary"
        title={`Search (${modKeyLabel}+P)`}
      >
        <Search className="w-5 h-5 mb-1" />
        <span className="text-xs font-medium">Search</span>
      </button>

      {/* Settings and profile */}
      {session && (
        <div className="flex flex-col items-center justify-center flex-1 h-full">
          <TransitionLink
            href="/settings"
            className={`flex flex-col items-center justify-center transition-colors duration-200 ${
              pathname === "/settings"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-dark-textSecondary"
            }`}
          >
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Settings</span>
          </TransitionLink>
        </div>
      )}
    </nav>
  );
}
