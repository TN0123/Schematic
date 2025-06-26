"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import { EventImpl } from "@fullcalendar/core/internal";
import "tailwindcss/tailwind.css";
import EventCreationModal from "./_components/EventCreationModal";
import { DeleteEventModal } from "./_components/DeleteEventModal";
import { SessionProvider, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import EventGenerationPanel from "./_components/EventGenerationPanel";
import GoalsPanel from "./_components/GoalsPanel";
import FileUploaderModal from "./_components/FileUploaderModal";
import IcsUploaderModal from "./_components/IcsUploaderModal";
import EventEditModal from "./_components/EventEditModal";
import { useNextStep } from "nextstepjs";
import MobilePanelTabs from "./_components/MobilePanelTabs";
import RemindersBar from "./_components/RemindersBar";
import CalendarComponent from "./_components/CalendarComponent";

// Import our custom hooks and utilities
import { useCalendarData } from "./hooks/useCalendarData";
import { useCalendarState } from "./hooks/useCalendarState";
import { useDailySummary } from "./hooks/useDailySummary";
import { GenerationResult } from "./types";
import { isSameDay, isRangeInsideFetched } from "./utils/calendarHelpers";

export default function CalendarApp() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/auth/login");
    },
  });
  const userId = session?.user?.id;

  // Initialize our custom hooks
  const dailySummary = useDailySummary(userId);
  const calendarData = useCalendarData(
    userId,
    dailySummary.refreshDailySummary
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

  const { startNextStep } = useNextStep();
  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);

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
      const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>`;
      const remindersIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;

      const buttons = document.querySelectorAll(".fc-refresh-button");
      buttons.forEach((button) => {
        button.innerHTML = refreshIcon;
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
      await calendarData.addEvent({
        title: calendarState.newEvent.title,
        start: calendarState.newEvent.start,
        end: calendarState.newEvent.end,
      });

      calendarState.setShowCreationModal(false);
      calendarState.setNewEvent({
        id: "",
        title: "",
        start: new Date(),
        end: new Date(),
      });
    }
  };

  const handleEditEvent = async () => {
    console.log("Editing event:", calendarState.eventToEdit);
    console.log("New event data:", calendarState.newEvent);

    if (!calendarState.eventToEdit) return;
    try {
      await calendarData.editEvent(calendarState.eventToEdit.id, {
        title: calendarState.newEvent.title,
        start: calendarState.newEvent.start,
        end: calendarState.newEvent.end,
      });

      console.log("Event updated successfully");
      calendarState.setNewEvent({
        id: "",
        title: "",
        start: new Date(),
        end: new Date(),
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
      const result = await calendarData.generateEventsAndReminders(inputText);

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
      const saveEvents = async () => {
        try {
          await calendarData.bulkAddEvents(calendarState.extractedEvents);
        } catch (error) {
          console.error("Error saving events:", error);
        }
      };
      saveEvents();
    }
  }, [calendarState.extractedEvents, calendarData]);

  // Enhanced keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  ]);

  // Initialize suggestions
  useEffect(() => {
    if (!calendarState.hasFetchedInitialSuggestions && userId) {
      calendarData.fetchSuggestions();
      calendarState.setHasFetchedInitialSuggestions(true);
    }
  }, [
    calendarState.hasFetchedInitialSuggestions,
    userId,
    calendarData,
    calendarState,
  ]);

  // Tour initialization
  useEffect(() => {
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
      if (calendarRef.current) {
        const timeoutId = setTimeout(() => {
          calendarRef.current?.getApi().updateSize();
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
    calendarState.setSuggestionsLoading(true);
    try {
      await calendarData.fetchSuggestions();
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
      <div className="h-screen w-full flex flex-col bg-white dark:bg-dark-background">
        {/* Desktop Layout */}
        <div className="hidden md:flex md:flex-row h-full">
          {/* Goals Panel */}
          <GoalsPanel />
          {/* Calendar */}
          <div
            ref={calendarContainerRef}
            className={`flex-1 flex flex-col p-2 md:p-4 h-full transition-all duration-200 relative dark:bg-dark-background dark:text-dark-textPrimary ${
              calendarState.showCalendarHeader
                ? "calendar-header-visible"
                : "calendar-header-hidden"
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
                ref={calendarRef}
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
              />
            </motion.div>
          </div>

          {/* Side Panel */}
          <EventGenerationPanel
            inputText={inputText}
            setInputText={setInputText}
            loading={calendarState.loading}
            handleSubmit={handleSubmit}
            setShowModal={(show) => {
              if (show) {
                calendarState.setModalInitialTab("event");
              }
              calendarState.setShowCreationModal(show);
            }}
            setIsFileUploaderModalOpen={
              calendarState.setIsFileUploaderModalOpen
            }
            setIsIcsUploaderModalOpen={calendarState.setIsIcsUploaderModalOpen}
            dailySummary={dailySummary.dailySummary}
            dailySummaryDate={dailySummary.dailySummaryDate}
            dailySummaryLoading={dailySummary.dailySummaryLoading}
            userId={userId || ""}
            generationResult={generationResult}
            onClearGenerationResult={handleClearGenerationResult}
          />
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col h-full">
          {/* Calendar Section - Top */}
          <div
            ref={calendarContainerRef}
            className={`flex-1 flex flex-col p-2 h-2/3 transition-all duration-200 relative dark:bg-dark-background dark:text-dark-textPrimary ${
              calendarState.showCalendarHeader
                ? "calendar-header-visible"
                : "calendar-header-hidden"
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
                ref={calendarRef}
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
              />
            </motion.div>
          </div>

          {/* Bottom Panel Section - Mobile */}
          <div className="h-1/3 bg-white dark:bg-dark-background border-t dark:border-dark-divider">
            <MobilePanelTabs
              inputText={inputText}
              setInputText={setInputText}
              loading={calendarState.loading}
              handleSubmit={handleSubmit}
              setShowModal={(show) => {
                if (show) {
                  calendarState.setModalInitialTab("event");
                }
                calendarState.setShowCreationModal(show);
              }}
              setIsFileUploaderModalOpen={
                calendarState.setIsFileUploaderModalOpen
              }
              setIsIcsUploaderModalOpen={
                calendarState.setIsIcsUploaderModalOpen
              }
              dailySummary={dailySummary.dailySummary}
              dailySummaryDate={dailySummary.dailySummaryDate}
              dailySummaryLoading={dailySummary.dailySummaryLoading}
            />
          </div>
        </div>

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
        <FileUploaderModal
          isOpen={calendarState.isFileUploaderModalOpen}
          onClose={() => calendarState.setIsFileUploaderModalOpen(false)}
          setEvents={calendarState.setExtractedEvents}
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
