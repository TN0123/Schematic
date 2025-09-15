"use client";

import { useEffect, useState } from "react";

export type ProductUpdateItem = {
  id: string;
  title: string;
  description: string;
  publishedAt: string; // ISO string
};

interface ChangelogModalProps {
  updates: ProductUpdateItem[];
}

export default function ChangelogModal({ updates }: ChangelogModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!updates || updates.length === 0) return null;
  if (isDismissed) return null;

  const latest = updates[0];

  const softClose = () => {
    setIsVisible(false);
    setTimeout(() => setIsDismissed(true), 200);
  };

  const acknowledgeAndClose = async () => {
    try {
      setIsVisible(false);
      await fetch("/api/user/updates/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latestPublishedAt: latest.publishedAt }),
      });
    } catch (_) {
      // swallow
    } finally {
      setTimeout(() => setIsDismissed(true), 200);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={softClose}
      role="dialog"
      aria-modal="true"
      aria-label="What's new"
    >
      <div
        className={`relative z-50 w-full max-w-lg md:max-w-xl transform rounded-2xl bg-white/90 dark:bg-dark-secondary/90 p-6 shadow-2xl ring-1 ring-black/5 backdrop-saturate-150 transition-all duration-200 ${
          isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">What's new</h3>
          <button
            onClick={softClose}
            className="ml-3 inline-flex items-center rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-dark-textSecondary dark:hover:bg-dark-actionDisabledBackground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <ul className="space-y-4 max-h-[60vh] overflow-auto pr-1">
          {updates.map((u) => {
            const date = new Date(u.publishedAt);
            const formatted = date.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            });
            return (
              <li key={u.id} className="rounded-xl border border-gray-200/70 dark:border-dark-divider p-4 bg-white/60 dark:bg-transparent">
                <div className="text-sm font-medium text-gray-900 dark:text-dark-textPrimary">
                  {formatted} — {u.title}
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-dark-textSecondary">{u.description}</p>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex justify-end">
          <button
            onClick={acknowledgeAndClose}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}


