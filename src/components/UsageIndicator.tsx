"use client";

import { useEffect, useState } from "react";

interface UsageStats {
  tier: "free" | "premium";
  documents: {
    used: number;
    limit: number;
    canCreate: boolean;
  };
  bulletins: {
    used: number;
    limit: number;
    canCreate: boolean;
  };
  premiumUses: {
    used: number;
    limit: number;
    resetAt: string | null;
    period: "weekly" | "monthly";
  };
}

interface UsageIndicatorProps {
  type: "documents" | "bulletins" | "premium-uses";
  className?: string;
}

// Shared cache to prevent multiple API calls
let usageCache: UsageStats | null = null;
let cachePromise: Promise<any> | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5000; // 5 seconds

export default function UsageIndicator({
  type,
  className = "",
}: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageStats | null>(usageCache);
  const [loading, setLoading] = useState(!usageCache);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      // Use cache if recent
      if (usageCache && Date.now() - cacheTime < CACHE_DURATION) {
        setUsage(usageCache);
        setLoading(false);
        return;
      }

      // Reuse in-flight request
      if (cachePromise) {
        const data = await cachePromise;
        setUsage(data.usage);
        setLoading(false);
        return;
      }

      // Make new request
      cachePromise = fetch("/api/subscription/status").then((r) => r.json());
      const data = await cachePromise;

      if (data.usage) {
        usageCache = data.usage;
        cacheTime = Date.now();
        setUsage(data.usage);
      }

      cachePromise = null;
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      cachePromise = null;
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  const getStats = () => {
    switch (type) {
      case "documents":
        return usage.documents;
      case "bulletins":
        return usage.bulletins;
      case "premium-uses":
        return {
          used: usage.premiumUses.used,
          limit: usage.premiumUses.limit,
        };
      default:
        return null;
    }
  };

  const stats = getStats();
  if (!stats) return null;

  const percentage = (stats.used / stats.limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = stats.used >= stats.limit;

  // Don't show for premium users with unlimited resources
  if (usage.tier === "premium" && type !== "premium-uses") {
    return null;
  }

  return (
    <div className={`text-sm ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-600 dark:text-dark-textSecondary">
          {type === "documents" && "Documents"}
          {type === "bulletins" && "Notes"}
          {type === "premium-uses" && "Premium AI"}
        </span>
        <span
          className={`font-medium ${
            isAtLimit
              ? "text-red-600 dark:text-red-400"
              : isNearLimit
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-gray-700 dark:text-dark-textPrimary"
          }`}
        >
          {stats.used} / {stats.limit === Infinity ? "∞" : stats.limit}
        </span>
      </div>
      {stats.limit !== Infinity && (
        <div className="w-full bg-gray-200 dark:bg-dark-tertiary rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit
                ? "bg-red-600"
                : isNearLimit
                ? "bg-yellow-600"
                : "bg-blue-600"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {type === "premium-uses" && usage.premiumUses.resetAt && (
        <p className="text-xs text-gray-500 dark:text-dark-textSecondary mt-1">
          Resets {new Date(usage.premiumUses.resetAt).toLocaleDateString()}{" "}
          (UTC)
        </p>
      )}
    </div>
  );
}
