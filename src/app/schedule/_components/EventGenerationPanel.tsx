"use client";

import {
  Plus,
  FileUp,
  PanelRightClose,
  Mic,
  CalendarPlus,
  RefreshCw,
  UserPen,
  CircleArrowUp,
  CircleStop,
  Pen,
  X,
  CalendarSync,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import ScheduleContextModal from "./ScheduleContextModal";
import EventEditModal from "./EventEditModal";
import EventReviewModal, { ExtractedEvent } from "./EventReviewModal";
import { Event as CalendarEvent } from "../types";
import {
  formatDateForDisplay,
  formatTimeForDisplay,
} from "../utils/calendarHelpers";

interface GenerationResult {
  eventsCount: number;
  remindersCount: number;
  events: Array<{
    id?: string;
    title: string;
    date: string;
    time?: string;
    links?: string[];
  }>;
  reminders: Array<{
    title: string;
    date: string;
    time?: string;
  }>;
}

interface EventGenerationPanelProps {
  setShowModal: (show: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  onCancelGeneration?: () => void;
  dailySummary: string;
  dailySummaryDate: Date | null;
  dailySummaryLoading: boolean;
  userId: string;
  generationResult?: GenerationResult | null;
  onClearGenerationResult?: () => void;
  onEditGeneratedEvent?: (
    id: string,
    data: { title: string; start: Date; end: Date; links?: string[] }
  ) => Promise<void> | void;
  onDeleteGeneratedEvent?: (id: string) => Promise<void> | void;
  setEvents?: (events: CalendarEvent[]) => void;
  width?: number;
  className?: string;
}

export default function EventGenerationPanel({
  setShowModal,
  setIsIcsUploaderModalOpen,
  inputText,
  setInputText,
  loading,
  handleSubmit,
  onCancelGeneration,
  dailySummary,
  dailySummaryDate,
  dailySummaryLoading,
  userId,
  generationResult,
  onClearGenerationResult,
  onEditGeneratedEvent,
  onDeleteGeneratedEvent,
  setEvents,
  width,
  className = "",
}: EventGenerationPanelProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScheduleContextModalOpen, setIsScheduleContextModalOpen] =
    useState(false);
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isGenerationResultExpanded, setIsGenerationResultExpanded] =
    useState(false);
  const [localGenerationResult, setLocalGenerationResult] =
    useState<GenerationResult | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(
    null
  );
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);

  // File upload state
  const [extractedEvents, setExtractedEvents] = useState<
    ExtractedEvent[] | null
  >(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (generationResult) {
      setLocalGenerationResult({
        ...generationResult,
        events: generationResult.events.map((e) => ({ ...e })),
        reminders: generationResult.reminders.map((r) => ({ ...r })),
      });
    } else {
      setLocalGenerationResult(null);
    }
  }, [generationResult]);

  // Load Google Calendar sync settings so we can show Manual Sync when set up
  useEffect(() => {
    const fetchGoogleSyncSettings = async () => {
      try {
        const response = await fetch("/api/google-calendar/sync-settings");
        if (response.ok) {
          const data = await response.json();
          setGoogleSyncEnabled(!!data.enabled);
          setSelectedCalendarId(data.calendarId || "");
        }
      } catch (error) {
        console.error("Error fetching Google sync settings:", error);
      }
    };
    fetchGoogleSyncSettings();
  }, []);

  const formatTwo = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const parseDateTime = (dateStr: string, timeStr?: string) => {
    let dt: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const t = timeStr && /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : "09:00";
      dt = new Date(`${dateStr}T${t}`);
    } else {
      const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
      dt = new Date(combined);
      if (isNaN(dt.getTime())) {
        dt = new Date();
      }
    }
    return dt;
  };

  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = formatTwo(date.getMonth() + 1);
    const day = formatTwo(date.getDate());
    return `${year}-${month}-${day}`;
  };

  const toLocalTimeString = (date: Date) => {
    return `${formatTwo(date.getHours())}:${formatTwo(date.getMinutes())}`;
  };

  const openEditModalForIndex = (index: number) => {
    if (!localGenerationResult) return;
    const item = localGenerationResult.events[index];
    const start = parseDateTime(item.date, item.time);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const evt: CalendarEvent = {
      id: `gen-${index}`,
      title: item.title,
      start,
      end,
      links: item.links || [],
      isSuggestion: true,
    };
    setEditingEventIndex(index);
    setEditingEvent(evt);
    setIsEditModalOpen(true);
  };

  const applyEditToLocal = () => {
    if (
      localGenerationResult &&
      editingEvent &&
      typeof editingEventIndex === "number"
    ) {
      const next = { ...localGenerationResult };
      next.events = next.events.map((e, i) => ({ ...e }));
      const edited = { ...next.events[editingEventIndex] };
      edited.title = editingEvent.title;
      if (editingEvent.start) {
        edited.date = formatDateForDisplay(editingEvent.start);
        edited.time = formatTimeForDisplay(editingEvent.start);
      }
      edited.links = editingEvent.links || [];
      next.events[editingEventIndex] = edited;
      setLocalGenerationResult(next);

      // Persist to calendar if we have an event id and callback
      if (edited.id && onEditGeneratedEvent) {
        try {
          const start = editingEvent.start;
          const end =
            editingEvent.end || new Date(start.getTime() + 60 * 60 * 1000);
          onEditGeneratedEvent(edited.id, {
            title: editingEvent.title,
            start,
            end,
            links: editingEvent.links,
          });
        } catch (e) {
          console.error("Failed to persist edited generated event", e);
        }
      }
    }
  };

  const deleteLocalAtIndex = (index: number) => {
    if (!localGenerationResult) return;
    const target = localGenerationResult.events[index];
    const next: GenerationResult = {
      ...localGenerationResult,
      events: localGenerationResult.events.filter((_, i) => i !== index),
      reminders: localGenerationResult.reminders.map((r) => ({ ...r })),
      eventsCount: Math.max(0, localGenerationResult.eventsCount - 1),
    };
    setLocalGenerationResult(next);

    if (target?.id && onDeleteGeneratedEvent) {
      try {
        onDeleteGeneratedEvent(target.id);
      } catch (e) {
        console.error("Failed to delete generated event from calendar", e);
      }
    }
  };

  const eventList = dailySummary.split("ADVICE")[0];
  const advice = dailySummary.split("ADVICE")[1];

  const handleToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript, setInputText]);

  // Keep the textarea height in sync with its content and reset when cleared
  useEffect(() => {
    const textarea = inputTextareaRef.current;
    if (!textarea) return;

    // Reset height to allow shrink, then set to content height if non-empty
    textarea.style.height = "auto";
    if (inputText && inputText.trim() !== "") {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    } else {
      // Empty input — clear inline height so it returns to default size
      textarea.style.height = "";
    }
  }, [inputText]);

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false });
    }
  };

  const handleManualSync = async () => {
    if (!googleSyncEnabled || !selectedCalendarId || isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch("/api/google-calendar/manual-sync", {
        method: "POST",
      });
      if (!response.ok) {
        console.error("Manual sync failed");
      }
    } catch (error) {
      console.error("Error performing manual sync:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    setIsFileUploading(true);
    setFileUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const isPdf = file.type === "application/pdf";
      const uploadUrl = isPdf ? "/api/upload-pdf" : "/api/upload-image";

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.events.length === 0) {
          setFileUploadError("No events found in the file.");
        } else {
          setExtractedEvents(data.events);
        }
      } else {
        setFileUploadError("Upload failed, service is down");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setFileUploadError("An error occurred while uploading.");
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (validTypes.includes(file.type)) {
        handleFileUpload(file);
      } else {
        setFileUploadError("Please upload a PDF, JPEG, or PNG file.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleEventReviewBack = () => {
    setExtractedEvents(null);
    setFileUploadError(null);
  };

  const handleAddExtractedEvents = (selectedEvents: ExtractedEvent[]) => {
    const formattedEvents = selectedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
    }));

    if (setEvents) {
      setEvents(formattedEvents);
    }

    setExtractedEvents(null);
    setFileUploadError(null);
  };

  return (
    <>
      <aside
        className={`hidden md:flex fixed md:relative z-30 h-full ${
          width ? "" : "w-80 md:w-96"
        } bg-white dark:bg-dark-background border-l dark:border-dark-divider px-4 py-4 flex-col gap-4 transition-all duration-300 ${className}`}
        style={width ? { width: `${width}px` } : undefined}
      >
        {/* Menu Bar - Always visible */}
        <div className="flex justify-between" id="event-menu-bar">
          {isMobileOpen && (
            <button
              onClick={handleToggle}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
            >
              <PanelRightClose
                size={24}
                className="text-gray-700 dark:text-dark-textSecondary"
              />
            </button>
          )}
          <div className="flex">
            <button
              className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
              onClick={() => {
                setShowModal(true);
                setIsMobileOpen(false);
              }}
            >
              <Plus size={20} />
            </button>
            <button
              className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
              onClick={() => {
                fileInputRef.current?.click();
                setIsMobileOpen(false);
              }}
              title="Upload PDF or Image"
            >
              <FileUp size={20} />
            </button>
            <button
              className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
              onClick={() => {
                setIsIcsUploaderModalOpen(true);
                setIsMobileOpen(false);
              }}
            >
              <CalendarPlus size={20} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {googleSyncEnabled && selectedCalendarId && (
              <button
                className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleManualSync}
                disabled={isSyncing}
                title={isSyncing ? "Syncing..." : "Sync with Google Calendar"}
              >
                {isSyncing ? (
                  <RefreshCw size={20} />
                ) : (
                  <CalendarSync size={20} />
                )}
              </button>
            )}
            <button
              className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
              onClick={() => {
                setIsScheduleContextModalOpen(true);
                setIsMobileOpen(false);
              }}
              id="event-menu-bar-context-button"
              title="Edit AI Context"
            >
              <UserPen size={20} />
            </button>
          </div>
        </div>

        {/* Input Area - Always visible */}
        <div id="event-adder">
          <div
            className={`flex flex-col bg-white dark:bg-dark-paper rounded-xl border shadow-sm transition-all duration-200 ${
              isDragging
                ? "border-blue-500 dark:border-blue-400 border-2 bg-blue-50 dark:bg-blue-900/10 ring-2 ring-blue-400/20"
                : "border-gray-200 dark:border-dark-divider focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20"
            }`}
          >
            <textarea
              ref={inputTextareaRef}
              className={`flex w-full p-4 pr-12 pb-8 h-auto resize-none bg-transparent focus:outline-none text-sm transition-colors ${
                loading
                  ? "text-gray-400 dark:text-dark-textDisabled cursor-not-allowed"
                  : "dark:text-dark-textPrimary cursor-text placeholder-gray-500 dark:placeholder-dark-textDisabled"
              }`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(
                  textarea.scrollHeight,
                  300
                )}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                  setIsMobileOpen(false);
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              placeholder={
                isDragging
                  ? "Drop your PDF or image here..."
                  : "Enter your events and reminders here"
              }
              disabled={loading}
            />
            <div className="flex w-full justify-between items-center px-2 py-1 border-t border-gray-200 dark:border-dark-divider">
              <div className="flex items-center" />
              <div className="flex items-center gap-2">
                <button
                  className={`p-1 rounded-full transition-colors duration-200 ${
                    listening
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover"
                  }`}
                  onClick={handleListen}
                  title={listening ? "Stop voice input" : "Start voice input"}
                >
                  <Mic
                    size={16}
                    className={
                      listening
                        ? "text-white"
                        : "text-black dark:text-dark-textPrimary"
                    }
                  />
                </button>
                {loading ? (
                  <button
                    className="p-1 rounded-full transition-colors duration-200 bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover"
                    onClick={() => {
                      onCancelGeneration?.();
                      setIsMobileOpen(false);
                    }}
                    title="Stop generating"
                  >
                    <CircleStop
                      size={16}
                      className="text-black dark:text-dark-textPrimary"
                    />
                  </button>
                ) : (
                  <button
                    className="p-1 rounded-full transition-colors duration-200 bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      handleSubmit();
                      setIsMobileOpen(false);
                    }}
                    disabled={!inputText.trim()}
                    title="Generate"
                  >
                    <CircleArrowUp
                      size={16}
                      className="text-black dark:text-dark-textPrimary"
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf, image/jpeg, image/png"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* File Upload Error Message */}
        {fileUploadError && (
          <div className="px-2 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">
              {fileUploadError}
            </p>
          </div>
        )}

        {/* File Upload Loading */}
        {isFileUploading && (
          <div className="px-2 py-4 flex items-center justify-center">
            <RefreshCw
              size={24}
              className="animate-spin text-blue-500 dark:text-blue-400"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-dark-textSecondary">
              Extracting events from file...
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto px-2 flex-1">
            {/* Generation Result Summary */}
            <AnimatePresence>
              {localGenerationResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <button
                      className="text-xs text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 dark:hover:text-dark-textPrimary transition-colors duration-200 cursor-pointer"
                      onClick={() =>
                        setIsGenerationResultExpanded(
                          !isGenerationResultExpanded
                        )
                      }
                    >
                      {(() => {
                        const eventsLen = localGenerationResult.events.length;
                        const remindersLen =
                          localGenerationResult.reminders.length;
                        return (
                          <>
                            Generated {eventsLen + remindersLen} items
                            {eventsLen > 0 && remindersLen > 0
                              ? ` (${eventsLen} events, ${remindersLen} reminders)`
                              : eventsLen > 0
                              ? ` (${eventsLen} events)`
                              : ` (${remindersLen} reminders)`}
                          </>
                        );
                      })()}
                    </button>
                    {onClearGenerationResult && (
                      <button
                        onClick={() => {
                          onClearGenerationResult();
                          setIsGenerationResultExpanded(false);
                          setLocalGenerationResult(null);
                        }}
                        className="text-gray-400 dark:text-dark-textDisabled hover:text-gray-600 dark:hover:text-dark-textSecondary text-xs ml-2 transition-colors duration-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {isGenerationResultExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-md shadow-sm max-h-40 overflow-y-auto"
                      >
                        <div className="p-3 space-y-3">
                          {localGenerationResult.events.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 dark:text-dark-textPrimary mb-1">
                                Events
                              </h4>
                              <div className="space-y-1">
                                {localGenerationResult.events.map(
                                  (event, index) => (
                                    <div
                                      key={index}
                                      className="text-xs text-gray-600 dark:text-dark-textSecondary"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="font-medium">
                                            {event.title}
                                          </div>
                                          <div className="text-gray-500 dark:text-dark-textDisabled">
                                            {event.date}
                                            {event.time && ` at ${event.time}`}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button
                                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-actionHover"
                                            title="Edit"
                                            onClick={() =>
                                              openEditModalForIndex(index)
                                            }
                                          >
                                            <Pen
                                              size={14}
                                              className="text-gray-700 dark:text-dark-textSecondary"
                                            />
                                          </button>
                                          <button
                                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-actionHover"
                                            title="Delete"
                                            onClick={() =>
                                              deleteLocalAtIndex(index)
                                            }
                                          >
                                            <X
                                              size={14}
                                              className="text-gray-700 dark:text-dark-textSecondary"
                                            />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {localGenerationResult.reminders.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 dark:text-dark-textPrimary mb-1">
                                Reminders
                              </h4>
                              <div className="space-y-1">
                                {localGenerationResult.reminders.map(
                                  (reminder, index) => (
                                    <div
                                      key={index}
                                      className="text-xs text-gray-600 dark:text-dark-textSecondary"
                                    >
                                      <div className="font-medium">
                                        {reminder.title}
                                      </div>
                                      <div className="text-gray-500 dark:text-dark-textDisabled">
                                        {reminder.date}
                                        {reminder.time &&
                                          ` at ${reminder.time}`}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {dailySummary && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-2 mt-4 flex-1"
                >
                  <div className="text-center">
                    <p className="text-lg text-gray-500 font-bold dark:text-dark-textSecondary">
                      Daily Summary
                    </p>
                    {dailySummaryDate && (
                      <p className="text-sm text-gray-400 dark:text-dark-textDisabled">
                        {dailySummaryDate.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  {dailySummaryLoading ? (
                    <div className="flex justify-center items-center py-4">
                      <RefreshCw
                        size={24}
                        className="animate-spin text-gray-500 dark:text-dark-textSecondary"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 px-2 dark:text-dark-textSecondary text-center prose dark:prose-invert whitespace-pre-line flex-1 overflow-y-auto">
                      <span>{eventList}</span>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: (props) => <p {...props} className="mt-4" />,
                        }}
                      >
                        {advice}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
      </aside>
      {/* Edit Event Modal */}
      {isEditModalOpen && editingEvent && (
        <EventEditModal
          newEvent={editingEvent}
          setNewEvent={
            ((value: SetStateAction<CalendarEvent>) => {
              setEditingEvent((prev) => {
                if (!prev) return prev;
                if (typeof value === "function") {
                  const updater = value as (
                    prev: CalendarEvent
                  ) => CalendarEvent;
                  return updater(prev);
                }
                return value;
              });
            }) as unknown as Dispatch<SetStateAction<CalendarEvent>>
          }
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEvent(null);
            setEditingEventIndex(null);
          }}
          handleEditEvent={() => {
            applyEditToLocal();
            setIsEditModalOpen(false);
            setEditingEvent(null);
            setEditingEventIndex(null);
          }}
          handleDeleteEvent={() => {
            if (typeof editingEventIndex === "number") {
              deleteLocalAtIndex(editingEventIndex);
            }
            setIsEditModalOpen(false);
            setEditingEvent(null);
            setEditingEventIndex(null);
          }}
        />
      )}
      <ScheduleContextModal
        isOpen={isScheduleContextModalOpen}
        onClose={() => setIsScheduleContextModalOpen(false)}
        userId={userId}
      />

      {/* Event Review Modal */}
      {extractedEvents && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                Review Extracted Events
              </h2>
              <button
                onClick={handleEventReviewBack}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-textSecondary text-lg font-bold"
              >
                ×
              </button>
            </div>
            <EventReviewModal
              events={extractedEvents}
              onBack={handleEventReviewBack}
              onAddAll={handleAddExtractedEvents}
            />
          </div>
        </div>
      )}
    </>
  );
}
