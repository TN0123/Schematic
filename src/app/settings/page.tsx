"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { useWriteSettings } from "@/components/WriteSettingsProvider";
import { useScheduleSettings } from "@/components/ScheduleSettingsProvider";
import { Moon, Sun, PenLine, Calendar, Crown, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import UsageIndicator from "@/components/UsageIndicator";

interface SubscriptionStatus {
  tier: "free" | "premium";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
}

export default function SettingsPage() {
  const { viewMode, setViewMode } = useWriteSettings();
  const { suggestionsEnabled, setSuggestionsEnabled } = useScheduleSettings();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    // Check if we just came back from a successful checkout
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const sessionId = urlParams.get("session_id");

    if (success === "true" && sessionId) {
      // Sync subscription data
      syncSubscription(sessionId);
    } else {
      fetchSubscriptionStatus();
    }
  }, []);

  const syncSubscription = async (sessionId: string) => {
    try {
      console.log("Syncing subscription after successful checkout...");
      const response = await fetch("/api/stripe/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        console.log("✅ Subscription synced successfully");
        // Remove the query params from URL
        window.history.replaceState({}, "", "/settings");
        // Fetch the updated status
        await fetchSubscriptionStatus();
      } else {
        console.error("Failed to sync subscription");
        // Still try to fetch status
        await fetchSubscriptionStatus();
      }
    } catch (error) {
      console.error("Error syncing subscription:", error);
      await fetchSubscriptionStatus();
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/api/subscription/status?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log("[Settings] Subscription data received:", data);
        setSubscriptionStatus(data);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // You'll need to set your Stripe price ID in environment variables
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_xxx";

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        alert("Failed to create checkout session. Please try again.");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    setUpgrading(true);
    try {
      const response = await fetch("/api/stripe/create-portal", {
        method: "POST",
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        alert("Failed to open customer portal. Please try again.");
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start h-screen pt-24 bg-gray-50 dark:bg-dark-background transition-all overflow-y-auto">
      <div className="py-6">
        <h1 className="text-4xl text-center font-bold text-gray-900 dark:text-dark-textPrimary mb-8">
          Settings
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-dark-textSecondary mb-12">
          Manage your preferences here.
        </p>
      </div>

      <div className="w-full max-w-2xl px-4 space-y-6">
        {/* Subscription Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-1">
                      Current Plan
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-dark-textPrimary">
                      {subscriptionStatus?.tier === "premium" ? (
                        <span className="flex items-center gap-2">
                          <Crown className="w-6 h-6 text-yellow-500" />
                          Premium
                        </span>
                      ) : (
                        "Free"
                      )}
                    </div>
                    {subscriptionStatus?.tier === "premium" &&
                      subscriptionStatus.currentPeriodEnd && (
                        <div className="text-xs text-gray-600 dark:text-dark-textSecondary mt-1">
                          Renews on{" "}
                          {new Date(
                            subscriptionStatus.currentPeriodEnd
                          ).toLocaleDateString()}
                        </div>
                      )}
                  </div>
                  {subscriptionStatus?.tier === "free" ? (
                    <button
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {upgrading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Upgrade to Premium"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleManageSubscription}
                      disabled={upgrading}
                      className="px-4 py-2 border border-gray-300 dark:border-dark-divider text-gray-700 dark:text-dark-textPrimary font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {upgrading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Manage Subscription"
                      )}
                    </button>
                  )}
                </div>

                {/* Usage Indicators */}
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-divider">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-textPrimary mb-3">
                    Usage Overview
                  </h3>
                  <UsageIndicator type="documents" />
                  <UsageIndicator type="bulletins" />
                  <UsageIndicator type="premium-uses" />
                </div>

                {/* Premium Features */}
                {subscriptionStatus?.tier === "free" && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      Premium Features
                    </h3>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-600 dark:text-green-400"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                        Unlimited documents
                      </li>
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-600 dark:text-green-400"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                        Unlimited notes
                      </li>
                      <li className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-green-600 dark:text-green-400"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                        150 premium AI requests per month
                      </li>
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
              Appearance
            </h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-800 dark:text-dark-textPrimary">
                Theme
              </span>
              <span className="flex items-center gap-2">
                <Moon className="dark:text-dark-textSecondary w-4 h-4" />
                <ThemeToggle />
                <Sun className="text-yellow-600 dark:text-yellow-400 w-4 h-4" />
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule
            </h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-800 dark:text-dark-textPrimary font-medium block mb-1">
                  AI Event Suggestions
                </span>
                <span className="text-xs text-gray-600 dark:text-dark-textSecondary">
                  Automatically suggest events based on your schedule
                </span>
              </div>
              <button
                onClick={() => setSuggestionsEnabled(!suggestionsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  suggestionsEnabled
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-dark-divider"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    suggestionsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Write Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              Write
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-800 dark:text-dark-textPrimary mb-3 block">
                Suggestion Display Mode
              </label>
              <p className="text-xs text-gray-600 dark:text-dark-textSecondary mb-3">
                Choose how AI suggestions are displayed in the editor
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode("changeHandler")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    viewMode === "changeHandler"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-paper hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      Change Handler
                    </div>
                    <div className="text-xs text-gray-600 dark:text-dark-textSecondary">
                      View suggestions in a separate panel with highlighted
                      original text
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode("diff")}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    viewMode === "diff"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-paper hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-dark-textPrimary mb-1">
                      Diff View
                    </div>
                    <div className="text-xs text-gray-600 dark:text-dark-textSecondary">
                      Show inline diffs with old text vs new text
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="px-6 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
