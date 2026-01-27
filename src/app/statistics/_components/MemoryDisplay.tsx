"use client";

import React from "react";
import { Brain, Calendar, Clock, Sparkles } from "lucide-react";
import { UserProfile } from "@/lib/memory";

interface MemoryDisplayProps {
  memory: {
    daily: string | null;
    yesterdayDaily: string | null;
    longterm: string | null;
    profile: UserProfile | null;
  } | null;
  loading: boolean;
}

export function MemoryDisplay({ memory, loading }: MemoryDisplayProps) {
  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center bg-white dark:bg-dark-paper rounded-xl border border-gray-200 dark:border-dark-divider">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Brain className="h-8 w-8 text-gray-300 dark:text-dark-divider" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-dark-divider rounded" />
        </div>
      </div>
    );
  }

  if (!memory || (!memory.daily && !memory.longterm && !memory.profile)) {
    return (
      <div className="h-48 flex flex-col items-center justify-center bg-white dark:bg-dark-paper rounded-xl border border-gray-200 dark:border-dark-divider text-gray-500 dark:text-dark-textSecondary">
        <Brain className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">No memories captured yet</p>
        <p className="text-xs mt-1 opacity-70">Interact with the AI assistant to build your memory</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
      {/* Long-term Memory */}
      <MemorySection
        title="Long-term Knowledge"
        icon={<Sparkles className="h-4 w-4 text-purple-500" />}
        emptyText="No long-term facts stored yet."
      >
        {memory.longterm ? (
          <div className="text-sm text-gray-700 dark:text-dark-textSecondary leading-relaxed whitespace-pre-wrap">
            {memory.longterm}
          </div>
        ) : null}
      </MemorySection>

      {/* Daily Memories */}
      <MemorySection
        title="Recent Notes"
        icon={<Calendar className="h-4 w-4 text-blue-500" />}
        emptyText="No recent daily notes."
      >
        {memory.daily || memory.yesterdayDaily ? (
          <div className="space-y-6">
            {memory.daily && (
              <div className="flex gap-6">
                <div className="w-20 flex-shrink-0 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 pt-1">
                    Today
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-dark-textSecondary leading-relaxed whitespace-pre-wrap">
                    {memory.daily}
                  </p>
                </div>
              </div>
            )}
            {memory.yesterdayDaily && (
              <div className="flex gap-6">
                <div className="w-20 flex-shrink-0 text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-dark-textDisabled pt-1">
                    Yesterday
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-dark-textDisabled leading-relaxed whitespace-pre-wrap opacity-80">
                    {memory.yesterdayDaily}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </MemorySection>

      {/* Structured Profile */}
      <MemorySection
        title="User Profile"
        icon={<Brain className="h-4 w-4 text-emerald-500" />}
        emptyText="No profile information yet."
      >
        <ProfileContent profile={memory.profile} />
      </MemorySection>
    </div>
  );
}

function MemorySection({
  title,
  icon,
  children,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  emptyText: string;
}) {
  const hasContent =
    React.Children.count(children) > 0 &&
    (Array.isArray(children)
      ? children.some((c) => c !== null)
      : children !== null);

  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-dark-paper border border-gray-100 dark:border-dark-divider group-hover:border-gray-200 dark:group-hover:border-dark-textDisabled transition-colors">
          {icon}
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-dark-textDisabled">
          {title}
        </h3>
      </div>
      <div className="pl-11 pr-4">
        {hasContent ? (
          children
        ) : (
          <p className="text-xs text-gray-400 dark:text-dark-textDisabled italic">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileContent({ profile }: { profile: UserProfile | null }) {
  if (!profile) return null;

  const sections = [
    { label: "Preferences", data: profile.preferences },
    { label: "Routines", data: profile.routines },
    { label: "Constraints", data: profile.constraints },
    { label: "Work Patterns", data: profile.workPatterns },
  ];

  const hasData = sections.some(s => s.data && Object.keys(s.data).length > 0);
  if (!hasData) return null;

  return (
    <div className="space-y-3">
      {sections.map(section => {
        if (!section.data || Object.keys(section.data).length === 0) return null;
        return (
          <div key={section.label}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              {section.label}
            </h4>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(section.data).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs py-0.5 border-b border-emerald-500/10 last:border-0">
                  <span className="text-gray-500 dark:text-dark-textSecondary capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span className="font-medium text-gray-900 dark:text-dark-textPrimary text-right ml-2">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
