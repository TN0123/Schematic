"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import "tailwindcss/tailwind.css";
import EventCreationModal from "./_components/EventCreationModal";
import { DeleteEventModal } from "./_components/DeleteEventModal";
import { SessionProvider, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { RefreshCw, ChevronUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EventGenerationPanel from "./_components/EventGenerationPanel";
import GoalsPanel from "./_components/GoalsPanel";
import IcsUploaderModal from "./_components/IcsUploaderModal";
import EventEditModal from "./_components/EventEditModal";
import { useNextStep } from "nextstepjs";
import MobilePanelTabs from "./_components/MobilePanelTabs";
import RemindersBar from "./_components/RemindersBar";
import CalendarComponent from "./_components/CalendarComponent";
import { createPortal } from "react-dom";
import { isMobileBrowser } from "@/components/utils/platform";

// Import our custom hooks and utilities
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarState } from "./hooks/useCalendarState";
import { useDailySummary } from "./hooks/useDailySummary";
import { GenerationResult } from "./types";
import { normalizeUrls } from "@/lib/url";
import { useScheduleSettings } from "@/components/ScheduleSettingsProvider";
import ResizablePanel from "./_components/ResizablePanel";

export default function CalendarApp() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/login");
    },
  });
  const userId = session?.user?.id;

  // Get schedule settings
  const { suggestionsEnabled } = useScheduleSettings();

  // Initialize our custom hooks
  const dailySummary = useDailySummary(userId);
  const calendarData = useCalendarData(
    userId,
    dailySummary.refreshDailySummary,
    suggestionsEnabled
  );

  const calendarState = useCalendarState(
    calendarData.events,
    calendarData.reminders,
    calendarData.fetchEvents,
    calendarData.fetchedRange,
    calendarData.setFetchedRange,
    calendarData.editEvent,
    calendarData.addEvent,
    calendarData.acceptSuggestion
  );

  // State that remains in the main component
  const [inputText, setInputText] = useState("");
  const [generationResult, setGenerationResult] =
    useState<GenerationResult | null>(null);
  const [hasUserClosedReminders, setHasUserClosedReminders] = useState(false);

  // Mobile panel state
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Panel width state
  const [goalsPanelWidth, setGoalsPanelWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("schedule-goals-panel-width");
      return saved ? parseInt(saved, 10) : 320;
    }
    return 320;
  });
  const [isGoalsPanelCollapsed, setIsGoalsPanelCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("goals-panel-collapsed");
      return saved === "true";
    }
    return false;
  });
  const [eventPanelWidth, setEventPanelWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("schedule-event-panel-width");
      return saved ? parseInt(saved, 10) : 384;
    }
    return 384;
  });

  const { startNextStep } = useNextStep();
  const desktopCalendarRef = useRef<FullCalendar>(null);
  const mobileCalendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  const generationAbortControllerRef = useRef<AbortController | null>(null);

  // Mobile panel effects
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Persist panel widths to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "schedule-goals-panel-width",
        goalsPanelWidth.toString()
      );
    }
  }, [goalsPanelWidth]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "schedule-event-panel-width",
        eventPanelWidth.toString()
      );
    }
  }, [eventPanelWidth]);

  // Update calendar size when panel widths change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      desktopCalendarRef.current?.getApi().updateSize();
      mobileCalendarRef.current?.getApi().updateSize();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [goalsPanelWidth, eventPanelWidth]);

  useEffect(() => {
    if (isMobilePanelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobilePanelOpen]);

  // Handle reminders UI state logic
  useEffect(() => {
    // Don't auto-show reminders if user has manually closed them
    if (hasUserClosedReminders) return;

    const currentDate = new Date();
    const sevenDaysFromNow = new Date(
      currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const hasRelevantUnreadReminders = calendarData.reminders.some(
      (r: any) =>
        !r.isRead && !r.isAISuggested && new Date(r.time) <= sevenDaysFromNow
    );

    if (hasRelevantUnreadReminders) {
      calendarState.setShowReminders(true);
      calendarState.setShowCalendarHeader(false);
    }
  }, [calendarData.reminders, calendarState, hasUserClosedReminders]);

  // Update button icons and badges
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const refreshIconStatic = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
      const refreshIconSpinning = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
      const remindersIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
      const statisticsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

      const buttons = document.querySelectorAll(".fc-refresh-button");
      buttons.forEach((button) => {
        // Swap icon based on loading state
        button.innerHTML = calendarState.suggestionsLoading
          ? refreshIconSpinning
          : refreshIconStatic;
      });

      const reminderButtons = document.querySelectorAll(".fc-reminders-button");
      reminderButtons.forEach((button) => {
        const iconContainer = document.createElement("div");
        iconContainer.style.position = "relative";
        iconContainer.style.display = "inline-flex";
        iconContainer.style.alignItems = "center";
        iconContainer.innerHTML = remindersIcon;

        if (calendarState.unreadNonAIReminders.length > 0) {
          const badge = document.createElement("div");
          badge.style.position = "absolute";
          badge.style.top = "-4px";
          badge.style.right = "-6px";
          badge.style.backgroundColor = "#ef4444";
          badge.style.color = "white";
          badge.style.fontSize = "9px";
          badge.style.fontWeight = "bold";
          badge.style.borderRadius = "50%";
          badge.style.width = "14px";
          badge.style.height = "14px";
          badge.style.display = "flex";
          badge.style.alignItems = "center";
          badge.style.justifyContent = "center";
          badge.textContent =
            calendarState.unreadNonAIReminders.length.toString();
          iconContainer.appendChild(badge);
        }

        button.innerHTML = "";
        button.appendChild(iconContainer);
      });

      const statisticsButtons = document.querySelectorAll(
        ".fc-statistics-button"
      );
      statisticsButtons.forEach((button) => {
        button.innerHTML = statisticsIcon;
      });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [
    calendarState.suggestionsLoading,
    calendarState.unreadNonAIReminders,
    calendarState.showCalendarHeader,
  ]);

  // Handle event operations
  const handleAddEvent = async (): Promise<void> => {
    console.log("Adding event:", calendarState.newEvent);
    if (
      calendarState.newEvent.title &&
      calendarState.newEvent.start &&
      calendarState.newEvent.end
    ) {
      const normalizedLinks = normalizeUrls(calendarState.newEvent.links);
      await calendarData.addEvent({
        title: calendarState.newEvent.title,
        start: calendarState.newEvent.start,
        end: calendarState.newEvent.end,
        links: normalizedLinks,
      });

      calendarState.setShowCreationModal(false);
      calendarState.setNewEvent({
        id: "",
        title: "",
        start: new Date(),
        end: new Date(),
        links: [],
      });
    }
  };

  const handleEditEvent = async () => {
    console.log("Editing event:", calendarState.eventToEdit);
    console.log("New event data:", calendarState.newEvent);

    if (!calendarState.eventToEdit) return;
    try {
      const normalizedLinks = normalizeUrls(calendarState.newEvent.links);
      await calendarData.editEvent(calendarState.eventToEdit.id, {
        title: calendarState.newEvent.title,
        start: calendarState.newEvent.start,
        end: calendarState.newEvent.end,
        links: normalizedLinks,
      });

      console.log("Event updated successfully");
      calendarState.setNewEvent({
        id: "",
        title: "",
        start: new Date(),
        end: new Date(),
        links: [],
      });
      calendarState.setShowEditModal(false);
    } catch (error) {
      console.error("Error editing event:", error);
    }
  };

  const handleDelete = async () => {
    if (calendarState.eventToDelete) {
      try {
        await calendarData.deleteEvent(calendarState.eventToDelete.id);
        calendarState.setIsDeleteModalOpen(false);
        calendarState.setEventToDelete(null);
        calendarState.setShowEditModal(false);
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  const handleDeleteMany = async () => {
    const idsToDelete = Array.from(calendarState.selectedEventIds);
    if (idsToDelete.length === 0) return;
    try {
      await calendarData.deleteMultipleEvents(idsToDelete);
      calendarState.setSelectedEventIds(new Set());
      calendarState.setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting multiple events:", error);
    }
  };

  // Handle text input submission
  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    calendarState.setLoading(true);
    setGenerationResult(null);

    try {
      const abortController = new AbortController();
      generationAbortControllerRef.current = abortController;

      const result = await calendarData.generateEventsAndReminders(inputText, {
        signal: abortController.signal,
      });

      if (result) {
        setGenerationResult(result);

        // Check if we should show reminders bar
        if (result.remindersCount > 0) {
          const currentDate = new Date();
          const sevenDaysFromNow = new Date(
            currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
          );

          const hasRelevantReminders = calendarData.reminders.some(
            (r: any) => !r.isAISuggested && new Date(r.time) <= sevenDaysFromNow
          );

          if (hasRelevantReminders) {
            // Reset the flag when new reminders are generated so they can be shown
            setHasUserClosedReminders(false);
            calendarState.setShowReminders(true);
            calendarState.setShowCalendarHeader(false);
          }
        }
      }

      setInputText("");
    } catch (error) {
      console.error("Error generating events:", error);
    } finally {
      generationAbortControllerRef.current = null;
      calendarState.setLoading(false);
    }
  };

  const handleCancelGeneration = () => {
    try {
      if (generationAbortControllerRef.current) {
        generationAbortControllerRef.current.abort();
        generationAbortControllerRef.current = null;
      }
    } catch (e) {
      console.error(e);
    } finally {
      calendarState.setLoading(false);
    }
  };

  const handleClearGenerationResult = () => {
    setGenerationResult(null);
  };

  // Enhanced paste handler that works with our hooks
  const handlePasteEvents = async () => {
    await calendarState.handlePasteEvents(calendarData.bulkAddEvents);
  };

  // Handle extracted events from file uploads
  useEffect(() => {
    if (calendarState.extractedEvents.length > 0) {
      // Create a local copy to avoid race conditions
      const eventsToAdd = [...calendarState.extractedEvents];

      // Clear immediately to prevent duplicate processing
      calendarState.setExtractedEvents([]);

      const saveEvents = async () => {
        try {
          await calendarData.bulkAddEvents(eventsToAdd);
        } catch (error) {
          console.error("Error saving events:", error);
        }
      };
      saveEvents();
    }
  }, [calendarState.extractedEvents, calendarData, calendarState]);

  // Enhanced keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle view switching when not typing in an input-like element
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isContentEditable =
        !!target && (target as HTMLElement).isContentEditable;
      const role = target?.getAttribute?.("role");
      const isTextInputFocused =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        isContentEditable ||
        role === "textbox";

      // Disable shortcuts when any modal is open
      const isAnyScheduleModalOpen =
        calendarState.showCreationModal ||
        calendarState.showEditModal ||
        calendarState.isIcsUploaderModalOpen;

      // Single-key shortcuts: m (month), w (week), d (day)
      if (
        !isTextInputFocused &&
        !isAnyScheduleModalOpen &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        const key = e.key.toLowerCase();
        if (key === "m") {
          e.preventDefault();
          desktopCalendarRef.current?.getApi().changeView("dayGridMonth");
          mobileCalendarRef.current?.getApi().changeView("dayGridMonth");
          return;
        }
        if (key === "w") {
          e.preventDefault();
          desktopCalendarRef.current?.getApi().changeView("timeGridWeek");
          mobileCalendarRef.current?.getApi().changeView("timeGridWeek");
          return;
        }
        if (key === "d") {
          e.preventDefault();
          desktopCalendarRef.current?.getApi().changeView("timeGridDay");
          mobileCalendarRef.current?.getApi().changeView("timeGridDay");
          return;
        }
      }

      if (e.key === "Backspace" && calendarState.selectedEventIds.size > 0) {
        calendarState.handleBackspaceDelete();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        calendarState.selectedEventIds.size > 0
      ) {
        e.preventDefault();
        calendarState.handleCopyEvents();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "v" &&
        calendarState.copiedEvents.length > 0
      ) {
        e.preventDefault();
        handlePasteEvents();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    calendarState.selectedEventIds,
    calendarState.copiedEvents,
    handlePasteEvents,
    calendarState.showCreationModal,
    calendarState.showEditModal,
    calendarState.isIcsUploaderModalOpen,
  ]);

  // Initialize suggestions
  useEffect(() => {
    if (
      !calendarState.hasFetchedInitialSuggestions &&
      userId &&
      suggestionsEnabled
    ) {
      calendarData.fetchSuggestions();
      calendarState.setHasFetchedInitialSuggestions(true);
    }
  }, [
    calendarState.hasFetchedInitialSuggestions,
    userId,
    suggestionsEnabled,
    calendarData,
    calendarState,
  ]);

  // Track previous value to detect actual toggles (not initial mount)
  const prevSuggestionsEnabled = useRef<boolean | undefined>(undefined);

  // Clear suggestions only when the user actively toggles the setting off
  useEffect(() => {
    // Skip initial mount - only react to actual changes
    if (prevSuggestionsEnabled.current !== undefined) {
      if (!suggestionsEnabled && prevSuggestionsEnabled.current) {
        // User just toggled OFF - clear suggestions
        calendarData.setEvents((currentEvents) =>
          currentEvents.filter((e) => !e.isSuggestion)
        );
        calendarData.setReminders((currentReminders) =>
          currentReminders.filter((r) => !r.isAISuggested)
        );
      }
    }
    // Update the previous value
    prevSuggestionsEnabled.current = suggestionsEnabled;
  }, [suggestionsEnabled, calendarData]);

  // Immediately toggle refresh icon spin on suggestions loading state change
  useEffect(() => {
    const buttons = document.querySelectorAll(".fc-refresh-button");
    const refreshIconStatic = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
    const refreshIconSpinning = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
    buttons.forEach((button) => {
      (button as HTMLElement).innerHTML = calendarState.suggestionsLoading
        ? refreshIconSpinning
        : refreshIconStatic;
    });
  }, [calendarState.suggestionsLoading]);

  // Tour initialization (desktop only)
  useEffect(() => {
    if (isMobileBrowser()) return;
    async function checkAndStartTour() {
      try {
        const res = await fetch("/api/user/onboarding-status");
        const data = await res.json();

        if (!data.hasCompletedScheduleTour) {
          startNextStep("scheduleTour");
        }
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error);
      }
    }

    checkAndStartTour();
  }, [startNextStep]);

  // Handle browser navigation to close reminders bar
  useEffect(() => {
    const handlePopState = () => {
      if (calendarState.showReminders) {
        calendarState.setShowReminders(false);
        calendarState.setShowCalendarHeader(true);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [calendarState.showReminders, calendarState]);

  // Calendar resize observer
  useEffect(() => {
    if (!calendarContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (desktopCalendarRef.current || mobileCalendarRef.current) {
        const timeoutId = setTimeout(() => {
          desktopCalendarRef.current?.getApi().updateSize();
          mobileCalendarRef.current?.getApi().updateSize();
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    });

    resizeObserver.observe(calendarContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Wrapper for fetch suggestions to include loading state
  const handleFetchSuggestions = async () => {
    if (!suggestionsEnabled) {
      console.log(
        "Suggestions are disabled. Enable them in Settings to use this feature."
      );
      return;
    }
    calendarState.setSuggestionsLoading(true);
    try {
      await calendarData.fetchSuggestions(true);
    } finally {
      calendarState.setSuggestionsLoading(false);
    }
  };

  // Custom toggle function that tracks user manual closing
  const handleToggleRemindersWithTracking = () => {
    if (calendarState.showReminders) {
      // User is closing the reminders bar manually
      setHasUserClosedReminders(true);
    }
    calendarState.handleToggleReminders();
  };

  return (
    <SessionProvider>
      <div className="h-screen w-full flex flex-col bg-white dark:bg-dark-background mobile-text-optimize">
        {/* Desktop Layout */}
        <div className="hidden md:flex md:flex-row h-full">
          {/* Goals Panel */}
          <ResizablePanel
            side="left"
            minWidth={isGoalsPanelCollapsed ? 56 : 280}
            maxWidth={600}
            width={isGoalsPanelCollapsed ? 56 : goalsPanelWidth}
            onWidthChange={setGoalsPanelWidth}
            disabled={isGoalsPanelCollapsed}
          >
            <GoalsPanel
              width={isGoalsPanelCollapsed ? 56 : goalsPanelWidth}
              onCollapsedChange={setIsGoalsPanelCollapsed}
            />
          </ResizablePanel>
          {/* Calendar */}
          <div
            ref={calendarContainerRef}
            className={`flex-1 flex flex-col h-full relative dark:bg-dark-background dark:text-dark-textPrimary ${
              isGoalsPanelCollapsed
                ? "p-2 md:pl-2 md:pr-4 md:py-4"
                : "p-2 md:p-4"
            } ${
              calendarState.showCalendarHeader
                ? "calendar-header-visible"
                : "calendar-header-hidden"
            } ${
              calendarState.isShiftPressed || calendarState.shiftSelectionActive
                ? "shift-select-active"
                : ""
            }`}
          >
            {/* Reminders Bar - replaces calendar header when visible */}
            <AnimatePresence mode="wait">
              {calendarState.showReminders && (
                <RemindersBar
                  isVisible={calendarState.showReminders}
                  onToggle={handleToggleRemindersWithTracking}
                  reminders={calendarData.reminders}
                  onDismissReminder={calendarData.dismissReminder}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {calendarData.calendarLoading && (
                <motion.div
                  className="absolute inset-0 flex flex-col justify-center items-center bg-white bg-opacity-70 backdrop-blur-sm z-10 dark:bg-dark-paper dark:bg-opacity-70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <RefreshCw
                    size={32}
                    className="animate-spin text-gray-600 dark:text-dark-textSecondary"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              className="flex-1 relative overflow-hidden"
              initial={false}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <CalendarComponent
                ref={desktopCalendarRef}
                events={calendarData.events}
                onEventClick={calendarState.handleEventClick}
                onEventUpdate={calendarState.handleEventUpdate}
                onSelect={calendarState.handleSelect}
                onUnselect={calendarState.handleUnselect}
                onDateClick={calendarState.handleDateClick}
                onDatesSet={calendarState.handleDatesSet}
                onRefresh={handleFetchSuggestions}
                onToggleReminders={handleToggleRemindersWithTracking}
                selectedEventIds={calendarState.selectedEventIds}
                copiedEvents={calendarState.copiedEvents}
                unreadNonAIReminders={calendarState.unreadNonAIReminders}
                onAcceptSuggestion={calendarData.acceptSuggestion}
                onRejectSuggestion={calendarData.rejectSuggestion}
                isShiftPressed={calendarState.isShiftPressed}
                shiftSelectionActive={calendarState.shiftSelectionActive}
                setLastSelectWasShift={calendarState.setLastSelectWasShift}
                todosByDate={calendarData.todosByDate}
              />
            </motion.div>
          </div>

          {/* Side Panel */}
          <ResizablePanel
            side="right"
            minWidth={280}
            maxWidth={600}
            width={eventPanelWidth}
            onWidthChange={setEventPanelWidth}
          >
            <EventGenerationPanel
              inputText={inputText}
              setInputText={setInputText}
              loading={calendarState.loading}
              handleSubmit={handleSubmit}
              onCancelGeneration={handleCancelGeneration}
              setShowModal={(show) => {
                if (show) {
                  calendarState.setModalInitialTab("event");
                }
                calendarState.setShowCreationModal(show);
              }}
              setIsIcsUploaderModalOpen={
                calendarState.setIsIcsUploaderModalOpen
              }
              dailySummary={dailySummary.dailySummary}
              dailySummaryDate={dailySummary.dailySummaryDate}
              dailySummaryLoading={dailySummary.dailySummaryLoading}
              userId={userId || ""}
              generationResult={generationResult}
              onClearGenerationResult={handleClearGenerationResult}
              onEditGeneratedEvent={async (id, data) => {
                try {
                  await calendarData.editEvent(id, data);
                } catch (e) {
                  console.error("Failed to persist generated event edit", e);
                }
              }}
              onDeleteGeneratedEvent={async (id) => {
                try {
                  await calendarData.deleteEvent(id);
                } catch (e) {
                  console.error("Failed to delete generated event", e);
                }
              }}
              setEvents={calendarState.setExtractedEvents}
              width={eventPanelWidth}
            />
          </ResizablePanel>
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col mobile-safe-area-top mobile-with-nav">
          {/* Calendar Section - Full Height */}
          <div
            ref={calendarContainerRef}
            className={`flex-1 flex flex-col p-2 min-h-0 transition-all duration-200 relative dark:bg-dark-background dark:text-dark-textPrimary ${
              calendarState.showCalendarHeader
                ? "calendar-header-visible"
                : "calendar-header-hidden"
            } ${
              calendarState.isShiftPressed || calendarState.shiftSelectionActive
                ? "shift-select-active"
                : ""
            }`}
          >
            {/* Reminders Bar - Mobile */}
            <AnimatePresence mode="wait">
              {calendarState.showReminders && (
                <RemindersBar
                  isVisible={calendarState.showReminders}
                  onToggle={handleToggleRemindersWithTracking}
                  reminders={calendarData.reminders}
                  onDismissReminder={calendarData.dismissReminder}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {calendarData.calendarLoading && (
                <motion.div
                  className="absolute inset-0 flex flex-col justify-center items-center bg-white bg-opacity-70 backdrop-blur-sm z-10 dark:bg-dark-paper dark:bg-opacity-70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <RefreshCw
                    size={32}
                    className="animate-spin text-gray-600 dark:text-dark-textSecondary"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              className="flex-1 relative overflow-hidden"
              initial={false}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.35,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <CalendarComponent
                ref={mobileCalendarRef}
                events={calendarData.events}
                onEventClick={calendarState.handleEventClick}
                onEventUpdate={calendarState.handleEventUpdate}
                onSelect={calendarState.handleSelect}
                onUnselect={calendarState.handleUnselect}
                onDateClick={calendarState.handleDateClick}
                onDatesSet={calendarState.handleDatesSet}
                onRefresh={handleFetchSuggestions}
                onToggleReminders={handleToggleRemindersWithTracking}
                selectedEventIds={calendarState.selectedEventIds}
                copiedEvents={calendarState.copiedEvents}
                unreadNonAIReminders={calendarState.unreadNonAIReminders}
                onAcceptSuggestion={calendarData.acceptSuggestion}
                onRejectSuggestion={calendarData.rejectSuggestion}
                isMobile={true}
                isShiftPressed={calendarState.isShiftPressed}
                shiftSelectionActive={calendarState.shiftSelectionActive}
                setLastSelectWasShift={calendarState.setLastSelectWasShift}
                todosByDate={calendarData.todosByDate}
              />
            </motion.div>
          </div>
        </div>

        {/* Mobile Floating Action Button */}
        {isMounted &&
          createPortal(
            <button
              className={`md:hidden fixed bottom-24 right-6 z-40 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform ${
                isMobilePanelOpen
                  ? "scale-0 opacity-0 pointer-events-none"
                  : "scale-100 opacity-100"
              }`}
              onClick={() => setIsMobilePanelOpen(true)}
            >
              <ChevronUp className="w-6 h-6" />
            </button>,
            document.body
          )}

        {/* Mobile Bottom Sheet Panel */}
        <AnimatePresence>
          {isMobilePanelOpen && (
            <motion.div
              className="md:hidden fixed inset-0 z-50 flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Backdrop */}
              <motion.div
                className="flex-1 bg-black bg-opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobilePanelOpen(false)}
              />

              {/* Bottom Sheet Content */}
              <motion.div
                className="bg-white dark:bg-dark-background rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col pb-16"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
              >
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-4 border-b dark:border-dark-divider">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
                    Schedule Tools
                  </h2>
                  <button
                    onClick={() => setIsMobilePanelOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200"
                  >
                    <X
                      size={20}
                      className="text-gray-500 dark:text-dark-textSecondary"
                    />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <MobilePanelTabs
                    inputText={inputText}
                    setInputText={setInputText}
                    loading={calendarState.loading}
                    handleSubmit={() => {
                      handleSubmit();
                      setIsMobilePanelOpen(false);
                    }}
                    onCancelGeneration={() => {
                      handleCancelGeneration();
                      setIsMobilePanelOpen(false);
                    }}
                    setShowModal={(show) => {
                      if (show) {
                        calendarState.setModalInitialTab("event");
                        setIsMobilePanelOpen(false);
                      }
                      calendarState.setShowCreationModal(show);
                    }}
                    setIsIcsUploaderModalOpen={(open) => {
                      if (open) setIsMobilePanelOpen(false);
                      calendarState.setIsIcsUploaderModalOpen(open);
                    }}
                    dailySummary={dailySummary.dailySummary}
                    dailySummaryDate={dailySummary.dailySummaryDate}
                    dailySummaryLoading={dailySummary.dailySummaryLoading}
                    setEvents={calendarState.setExtractedEvents}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        {calendarState.showCreationModal && (
          <EventCreationModal
            newEvent={calendarState.newEvent}
            setNewEvent={calendarState.setNewEvent}
            setShowModal={(show) => {
              if (!show) {
                calendarState.setModalInitialTab("event");
              }
              calendarState.setShowCreationModal(show);
            }}
            handleAddEvent={handleAddEvent}
            onCreateReminder={calendarData.createReminder}
            initialTab={calendarState.modalInitialTab}
          />
        )}

        {calendarState.showEditModal && (
          <EventEditModal
            newEvent={calendarState.newEvent}
            setNewEvent={calendarState.setNewEvent}
            onClose={() => {
              calendarState.setShowEditModal(false);
              calendarState.setNewEvent({
                id: "",
                title: "",
                start: new Date(),
                end: new Date(),
                links: [],
              });
            }}
            handleEditEvent={handleEditEvent}
            handleDeleteEvent={handleDelete}
          />
        )}

        <DeleteEventModal
          isOpen={calendarState.isDeleteModalOpen}
          event={calendarState.eventToDelete}
          selectedCount={calendarState.selectedEventIds.size}
          onClose={() => {
            calendarState.setIsDeleteModalOpen(false);
            calendarState.setEventToDelete(null);
            calendarState.setSelectedEventIds(new Set());
          }}
          onDelete={
            calendarState.eventToDelete ? handleDelete : handleDeleteMany
          }
        />
        <IcsUploaderModal
          isOpen={calendarState.isIcsUploaderModalOpen}
          onClose={() => calendarState.setIsIcsUploaderModalOpen(false)}
          setEvents={calendarState.setExtractedEvents}
        />
      </div>
    </SessionProvider>
  );
}
