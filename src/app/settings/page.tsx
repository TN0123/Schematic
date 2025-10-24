"use client";

import ThemeToggle from "@/components/ThemeToggle";
import { useWriteSettings } from "@/components/WriteSettingsProvider";
import { useScheduleSettings } from "@/components/ScheduleSettingsProvider";
import {
  Moon,
  Sun,
  PenLine,
  Calendar,
  Crown,
  Loader2,
  TrendingUp,
  Trash2,
  Bot,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
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

interface HabitSettings {
  habitLearningEnabled: boolean;
  lastHabitRefinementAt: string | null;
  habitCount: number;
}

export default function SettingsPage() {
  const { viewMode, setViewMode } = useWriteSettings();
  const { suggestionsEnabled, setSuggestionsEnabled } = useScheduleSettings();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [habitSettings, setHabitSettings] = useState<HabitSettings | null>(
    null
  );
  const [habitLoading, setHabitLoading] = useState(true);
  const [clearingData, setClearingData] = useState(false);
  const [assistantName, setAssistantName] = useState("AI Life Assistant");
  const [isEditingAssistantName, setIsEditingAssistantName] = useState(false);
  const [tempAssistantName, setTempAssistantName] = useState("");
  const [assistantNameLoading, setAssistantNameLoading] = useState(false);

  // Google Calendar Sync state
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [syncToggleOn, setSyncToggleOn] = useState(false); // Tracks if toggle is on (even if sync not fully enabled)

  useEffect(() => {
    // Check if we just came back from a successful checkout
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const sessionId = urlParams.get("session_id");

    if (success === "true" && sessionId) {
      // Sync subscription data
      syncSubscription(sessionId);
    } else {
      fetchSubscriptionStatus().then((status) => {
        // Check if user signed in with intent to checkout
        const shouldCheckout = sessionStorage.getItem("checkout_after_signin");
        if (shouldCheckout === "true") {
          sessionStorage.removeItem("checkout_after_signin");

          // Only trigger checkout if user doesn't already have premium
          if (status?.tier !== "premium") {
            setTimeout(() => {
              handleUpgrade();
            }, 500);
          }
        }
      });
    }

    // Fetch habit settings
    fetchHabitSettings();

    // Fetch assistant name
    fetchAssistantName();

    // Fetch Google Calendar sync settings
    fetchGoogleSyncSettings();
  }, []);

  const fetchAssistantName = async () => {
    try {
      const response = await fetch("/api/user/assistant-name");
      if (response.ok) {
        const data = await response.json();
        setAssistantName(data.assistantName);
      }
    } catch (error) {
      console.error("Error fetching assistant name:", error);
    }
  };

  const syncSubscription = async (sessionId: string) => {
    try {
      const response = await fetch("/api/stripe/sync-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
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
        setSubscriptionStatus(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleUpgrade = async () => {
    // Prevent upgrading if already premium
    if (subscriptionStatus?.tier === "premium") {
      console.log("User already has premium subscription");
      return;
    }

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

  const fetchHabitSettings = async () => {
    try {
      const response = await fetch("/api/user/habit-settings");
      if (response.ok) {
        const data = await response.json();
        setHabitSettings(data);
      }
    } catch (error) {
      console.error("Error fetching habit settings:", error);
    } finally {
      setHabitLoading(false);
    }
  };

  const toggleHabitLearning = async () => {
    if (!habitSettings) return;

    try {
      const newValue = !habitSettings.habitLearningEnabled;
      const response = await fetch("/api/user/habit-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitLearningEnabled: newValue }),
      });

      if (response.ok) {
        const data = await response.json();
        setHabitSettings((prev) => (prev ? { ...prev, ...data } : null));
      } else {
        alert("Failed to update habit learning settings. Please try again.");
      }
    } catch (error) {
      console.error("Error toggling habit learning:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const clearHabitData = async () => {
    const confirmed = confirm(
      "Are you sure you want to delete all your habit learning data? This action cannot be undone."
    );

    if (!confirmed) return;

    setClearingData(true);
    try {
      const response = await fetch("/api/user/habit-settings", {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh habit settings
        await fetchHabitSettings();
        alert("All habit data has been cleared successfully.");
      } else {
        alert("Failed to clear habit data. Please try again.");
      }
    } catch (error) {
      console.error("Error clearing habit data:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setClearingData(false);
    }
  };

  const handleEditAssistantName = () => {
    setTempAssistantName(assistantName);
    setIsEditingAssistantName(true);
  };

  const handleSaveAssistantName = async () => {
    if (tempAssistantName.trim() === assistantName) {
      setIsEditingAssistantName(false);
      return;
    }

    // Client-side sanitization
    const sanitizedName = tempAssistantName
      .trim()
      .replace(/["'`\\]/g, "") // Remove quotes and backslashes
      .replace(/[\r\n\t]/g, " ") // Replace newlines and tabs with spaces
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .substring(0, 50); // Ensure max length

    if (sanitizedName.length === 0) {
      alert("Assistant name contains only invalid characters");
      return;
    }

    setAssistantNameLoading(true);
    try {
      const response = await fetch("/api/user/assistant-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantName: sanitizedName }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssistantName(data.assistantName);
        setIsEditingAssistantName(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update assistant name");
      }
    } catch (error) {
      console.error("Error updating assistant name:", error);
      alert("Failed to update assistant name");
    } finally {
      setAssistantNameLoading(false);
    }
  };

  const handleCancelEditAssistantName = () => {
    setIsEditingAssistantName(false);
    setTempAssistantName("");
  };

  // Google Calendar Sync functions
  const fetchGoogleSyncSettings = async () => {
    try {
      const response = await fetch("/api/google-calendar/sync-settings");
      if (response.ok) {
        const data = await response.json();
        setGoogleSyncEnabled(data.enabled);
        setSyncToggleOn(data.enabled);
        setSelectedCalendarId(data.calendarId || "");
        setLastSyncAt(data.lastSyncAt);
      }
    } catch (error) {
      console.error("Error fetching Google sync settings:", error);
    }
  };

  const fetchGoogleCalendars = async () => {
    setCalendarsLoading(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/google-calendar/calendars");
      if (response.ok) {
        const data = await response.json();
        setGoogleCalendars(data.calendars);
      } else {
        setSyncError(
          "Failed to fetch calendars. Please ensure you have granted calendar permissions."
        );
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
      setSyncError("Failed to fetch calendars. Please try again.");
    } finally {
      setCalendarsLoading(false);
    }
  };

  const handleSyncToggle = async (enabled: boolean) => {
    setSyncLoading(true);
    setSyncError(null);
    setSyncToggleOn(enabled);

    try {
      // If enabling sync, first fetch calendars and let user select one
      if (enabled) {
        await fetchGoogleCalendars();
        // Don't enable sync yet - wait for user to select a calendar
        return;
      }

      // If disabling sync, proceed with the API call
      const response = await fetch("/api/google-calendar/sync-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          calendarId: undefined,
        }),
      });

      if (response.ok) {
        setGoogleSyncEnabled(enabled);
        setSelectedCalendarId("");
      } else {
        setSyncError("Failed to update sync settings. Please try again.");
        setSyncToggleOn(false); // Revert toggle on error
      }
    } catch (error) {
      console.error("Error updating sync settings:", error);
      setSyncError("Failed to update sync settings. Please try again.");
      setSyncToggleOn(false); // Revert toggle on error
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    setSelectedCalendarId(calendarId);
    setSyncLoading(true);
    setSyncError(null);

    try {
      const response = await fetch("/api/google-calendar/sync-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          calendarId,
        }),
      });

      if (response.ok) {
        setGoogleSyncEnabled(true);
      } else {
        setSyncError(
          "Failed to enable sync with selected calendar. Please try again."
        );
      }
    } catch (error) {
      console.error("Error enabling sync:", error);
      setSyncError("Failed to enable sync. Please try again.");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      const response = await fetch("/api/google-calendar/manual-sync", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLastSyncAt(new Date().toISOString());
        } else {
          setSyncError(
            data.errors?.join(", ") || "Sync failed. Please try again."
          );
        }
      } else {
        setSyncError("Failed to sync. Please try again.");
      }
    } catch (error) {
      console.error("Error performing manual sync:", error);
      setSyncError("Failed to sync. Please try again.");
    } finally {
      setSyncLoading(false);
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

        {/* AI Assistant Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Assistant
            </h2>
          </div>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-800 dark:text-dark-textPrimary font-medium block mb-1">
                  Assistant Name
                </span>
                <span className="text-xs text-gray-600 dark:text-dark-textSecondary">
                  Customize your AI assistant's name
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isEditingAssistantName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempAssistantName}
                      onChange={(e) => setTempAssistantName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveAssistantName();
                        } else if (e.key === "Escape") {
                          handleCancelEditAssistantName();
                        }
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 dark:border-dark-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-dark-background dark:text-dark-textPrimary"
                      autoFocus
                      maxLength={50}
                      disabled={assistantNameLoading}
                    />
                    <button
                      onClick={handleSaveAssistantName}
                      disabled={assistantNameLoading}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save name"
                    >
                      {assistantNameLoading ? (
                        <Loader2
                          size={16}
                          className="animate-spin text-gray-500"
                        />
                      ) : (
                        <Check
                          size={16}
                          className="text-green-600 dark:text-green-400"
                        />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEditAssistantName}
                      disabled={assistantNameLoading}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel"
                    >
                      <X
                        size={16}
                        className="text-gray-500 dark:text-dark-textSecondary"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-textPrimary">
                      {assistantName}
                    </span>
                    <button
                      onClick={handleEditAssistantName}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-lg transition-colors duration-200"
                      title="Edit assistant name"
                    >
                      <PenLine
                        size={16}
                        className="text-gray-500 dark:text-dark-textSecondary"
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Google Calendar Sync Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Google Calendar Sync
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-800 dark:text-dark-textPrimary font-medium block mb-1">
                  Enable Calendar Sync
                </span>
                <span className="text-xs text-gray-600 dark:text-dark-textSecondary">
                  Sync your events with Google Calendar
                </span>
              </div>
              <button
                onClick={() => handleSyncToggle(!syncToggleOn)}
                disabled={syncLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  syncToggleOn
                    ? "bg-blue-600"
                    : "bg-gray-300 dark:bg-dark-divider"
                } ${syncLoading ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    syncToggleOn ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {syncToggleOn && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-800 dark:text-dark-textPrimary mb-2 block">
                      Select Calendar
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => handleCalendarChange(e.target.value)}
                        disabled={syncLoading || calendarsLoading}
                        className="flex-1 border border-gray-300 dark:border-dark-divider rounded-lg px-3 py-2 bg-white dark:bg-dark-background dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a calendar...</option>
                        {googleCalendars.map((calendar) => (
                          <option key={calendar.id} value={calendar.id}>
                            {calendar.summary}{" "}
                            {calendar.primary ? "(Primary)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={fetchGoogleCalendars}
                        disabled={calendarsLoading || syncLoading}
                        className="px-3 py-2 bg-gray-100 dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-hover rounded-lg transition-colors disabled:opacity-50"
                      >
                        {calendarsLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-dark-textPrimary">
                        Manual Sync
                      </span>
                      <p className="text-xs text-gray-600 dark:text-dark-textSecondary">
                        {lastSyncAt
                          ? `Last synced: ${new Date(
                              lastSyncAt
                            ).toLocaleString()}`
                          : "Never synced"}
                      </p>
                    </div>
                    <button
                      onClick={handleManualSync}
                      disabled={syncLoading || !selectedCalendarId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {syncLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Sync Now
                    </button>
                  </div>
                </div>

                {syncError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm text-red-800 dark:text-red-200">
                      {syncError}
                    </span>
                  </div>
                )}
              </>
            )}
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

            <div className="space-y-4 mt-6 pt-4 border-t border-gray-200 dark:border-dark-divider">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Habit Learning
              </h3>
              {habitLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-800 dark:text-dark-textPrimary font-medium block mb-1">
                        Enable Habit Learning
                      </span>
                      <span className="text-xs text-gray-600 dark:text-dark-textSecondary">
                        Learn from your patterns to suggest better events
                      </span>
                    </div>
                    <button
                      onClick={toggleHabitLearning}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        habitSettings?.habitLearningEnabled
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-dark-divider"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          habitSettings?.habitLearningEnabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {habitSettings && (
                    <div className="pt-4 border-t border-gray-200 dark:border-dark-divider">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary">
                          Learned Habits
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-dark-textPrimary">
                          {habitSettings.habitCount}
                        </span>
                      </div>

                      {habitSettings.lastHabitRefinementAt && (
                        <p className="text-xs text-gray-600 dark:text-dark-textSecondary mb-4">
                          Last updated:{" "}
                          {new Date(
                            habitSettings.lastHabitRefinementAt
                          ).toLocaleDateString()}
                        </p>
                      )}

                      <button
                        onClick={clearHabitData}
                        disabled={clearingData}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {clearingData ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Clearing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Clear All Habit Data
                          </>
                        )}
                      </button>

                      <p className="text-xs text-gray-500 dark:text-dark-textDisabled mt-2">
                        This will permanently delete all learned habits and
                        event tracking data.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Habit Learning moved into Schedule section above */}

        {/* Write Settings */}
        <div className="border-2 border-gray-200 dark:border-dark-divider rounded-xl overflow-hidden">
          <div className="bg-gray-100 dark:bg-dark-secondary px-4 py-3 border-b border-gray-200 dark:border-dark-divider">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              Notebook
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
              </div>
            </div>
          </div>
        </div>

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
                      className="px-4 py-2 border border-gray-300 dark:border-dark-divider text-gray-700 dark:text-dark-textPrimary font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Sign Out */}
        <div className="flex justify-center pb-8">
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
