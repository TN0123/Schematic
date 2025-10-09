import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Target,
  Plus,
  FileUp,
  Mic,
  RefreshCw,
  CircleArrowUp,
  Square,
} from "lucide-react";
import { Goal, GoalDuration } from "./GoalsPanel";
import GoalCard from "./GoalCard";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EventReviewModal, { ExtractedEvent } from "./EventReviewModal";
import { Event as CalendarEvent } from "../types";

interface MobilePanelTabsProps {
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  onCancelGeneration?: () => void;
  setShowModal: (show: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
  dailySummary: string;
  dailySummaryDate: Date | null;
  dailySummaryLoading: boolean;
  setEvents?: (events: CalendarEvent[]) => void;
}

export default function MobilePanelTabs({
  inputText,
  setInputText,
  loading,
  handleSubmit,
  onCancelGeneration,
  setShowModal,
  setIsIcsUploaderModalOpen,
  dailySummary,
  dailySummaryDate,
  dailySummaryLoading,
  setEvents,
}: MobilePanelTabsProps) {
  const [activeTab, setActiveTab] = useState<"events" | "goals">("events");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [filters, setFilters] = useState<GoalDuration[]>([]);
  const [removingGoals, setRemovingGoals] = useState<string[]>([]);
  const { data: session } = useSession();

  // File upload state
  const [extractedEvents, setExtractedEvents] = useState<
    ExtractedEvent[] | null
  >(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false });
    }
  };

  useEffect(() => {
    if (activeTab === "goals") {
      fetchGoals();
    }
  }, [activeTab]);

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) {
        throw new Error("Failed to fetch goals");
      }
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const addGoal = async () => {
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalToAdd,
        type: currentDuration,
      }),
    });

    const newGoal = await response.json();
    setGoals([...goals, newGoal]);
    setGoalToAdd("");
  };

  const deleteGoal = async (id: string) => {
    setRemovingGoals((prev) => [...prev, id]);

    await fetch(`/api/goals/${id}`, {
      method: "DELETE",
    });

    setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== id));
    setRemovingGoals((prev) => prev.filter((goalId) => goalId !== id));
  };

  const handleFilterChange = (duration: GoalDuration) => {
    setFilters((prevFilters) =>
      prevFilters.includes(duration)
        ? prevFilters.filter((filter) => filter !== duration)
        : [...prevFilters, duration]
    );
  };

  const filteredGoals =
    filters.length > 0
      ? goals.filter((goal) => filters.includes(goal.type))
      : goals;

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
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b dark:border-dark-divider bg-gray-50 dark:bg-dark-secondary">
        <button
          onClick={() => setActiveTab("events")}
          className={`flex-1 py-4 px-4 text-center font-medium transition-all duration-200 touch-manipulation ${
            activeTab === "events"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-dark-background"
              : "text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover active:bg-gray-200 dark:active:bg-dark-actionSelected"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar size={18} />
            <span className="text-sm">Events</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`flex-1 py-4 px-4 text-center font-medium transition-all duration-200 touch-manipulation ${
            activeTab === "goals"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-dark-background"
              : "text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover active:bg-gray-200 dark:active:bg-dark-actionSelected"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Target size={18} />
            <span className="text-sm">Goals</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "events" ? (
          <div className="p-4 flex flex-col gap-6">
            {/* Event Generation */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary text-base">
                Generate with AI
              </h3>
              <div className="relative">
                <textarea
                  className="w-full p-4 pr-20 pb-12 bg-gray-50 dark:bg-dark-paper border dark:border-dark-divider rounded-xl resize-none text-black dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base placeholder-gray-400 dark:placeholder-dark-textDisabled touch-manipulation"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe your schedule to generate events..."
                  rows={3}
                  style={{ fontSize: "16px" }} // Prevents zoom on iOS
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    className={`p-2 rounded-full transition-all duration-200 touch-manipulation ${
                      listening
                        ? "bg-red-500 hover:bg-red-600 active:bg-red-700"
                        : "bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover active:bg-gray-400 dark:active:bg-dark-actionSelected"
                    }`}
                    onClick={handleListen}
                    title={listening ? "Stop voice input" : "Start voice input"}
                  >
                    <Mic
                      size={18}
                      className={
                        listening
                          ? "text-white"
                          : "text-black dark:text-dark-textPrimary"
                      }
                    />
                  </button>
                  {loading ? (
                    <button
                      className="p-2 rounded-full transition-all duration-200 touch-manipulation bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover active:bg-gray-400 dark:active:bg-dark-actionSelected"
                      onClick={() => onCancelGeneration?.()}
                      title="Stop generating"
                    >
                      <Square
                        size={18}
                        fill="currentColor"
                        className="text-black dark:text-dark-textPrimary"
                      />
                    </button>
                  ) : (
                    <button
                      className="p-2 rounded-full transition-all duration-200 touch-manipulation bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover active:bg-gray-400 dark:active:bg-dark-actionSelected disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleSubmit}
                      disabled={!inputText.trim()}
                      title="Generate"
                    >
                      <CircleArrowUp
                        size={18}
                        className="text-black dark:text-dark-textPrimary"
                      />
                    </button>
                  )}
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
              <div className="px-3 py-2 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {fileUploadError}
                </p>
              </div>
            )}

            {/* File Upload Loading */}
            {isFileUploading && (
              <div className="px-3 py-4 flex items-center justify-center">
                <RefreshCw
                  size={24}
                  className="animate-spin text-blue-500 dark:text-blue-400"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-dark-textSecondary">
                  Extracting events from file...
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary text-base">
                Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-actionHover active:bg-gray-300 dark:active:bg-dark-actionSelected transition-all duration-200 border dark:border-dark-divider text-sm font-medium touch-manipulation min-h-[44px]"
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={18} />
                  Add Event
                </button>
                <button
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-actionHover active:bg-gray-300 dark:active:bg-dark-actionSelected transition-all duration-200 border dark:border-dark-divider text-sm font-medium touch-manipulation min-h-[44px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={18} />
                  Upload
                </button>
                <button
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-xl hover:bg-gray-200 dark:hover:bg-dark-actionHover active:bg-gray-300 dark:active:bg-dark-actionSelected transition-all duration-200 border dark:border-dark-divider text-sm font-medium touch-manipulation min-h-[44px]"
                  onClick={() => setIsIcsUploaderModalOpen(true)}
                >
                  <Calendar size={18} />
                  Import from .ics
                </button>
              </div>
            </div>

            <AnimatePresence>
              {dailySummary && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-col gap-2"
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
                      <span>{dailySummary.split("ADVICE")[0]}</span>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: (props) => <p {...props} className="mt-4" />,
                        }}
                      >
                        {dailySummary.split("ADVICE")[1]}
                      </ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-6">
            {/* Add Goal */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary text-base">
                Add New Goal
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={goalToAdd}
                    onChange={(e) => setGoalToAdd(e.target.value)}
                    placeholder="Enter goal title..."
                    className="w-full px-4 py-3 border dark:border-dark-divider rounded-xl bg-white dark:bg-dark-paper text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base touch-manipulation"
                    style={{ fontSize: "16px" }} // Prevents zoom on iOS
                  />
                  <select
                    value={currentDuration}
                    onChange={(e) =>
                      setCurrentDuration(e.target.value as GoalDuration)
                    }
                    className="w-full px-4 py-3 border dark:border-dark-divider rounded-xl bg-white dark:bg-dark-paper text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base touch-manipulation"
                  >
                    {Object.values(GoalDuration).map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addGoal}
                  disabled={!goalToAdd.trim()}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base touch-manipulation min-h-[44px]"
                >
                  Add Goal
                </button>
              </div>
            </div>

            {/* Goals List */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary text-base">
                Your Goals
              </h3>
              {/* Goal Filters */}
              <div className="flex gap-2 flex-wrap">
                {Object.values(GoalDuration).map((duration) => (
                  <button
                    key={duration}
                    className={`text-sm font-medium px-4 py-2 rounded-full border transition-all duration-200 touch-manipulation min-h-[36px] ${
                      filters.includes(duration)
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-blue-500 dark:text-white dark:border-blue-500"
                        : "text-gray-700 border-gray-300 hover:bg-gray-100 active:bg-gray-200 dark:text-dark-textSecondary dark:border-dark-divider dark:hover:bg-dark-actionHover dark:active:bg-dark-actionSelected"
                    }`}
                    onClick={() => handleFilterChange(duration)}
                  >
                    {duration}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredGoals.length > 0 ? (
                  filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      handleGoalClick={deleteGoal}
                      removing={removingGoals.includes(goal.id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-dark-textSecondary text-sm">
                      No goals yet. Add one above!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Review Modal */}
      {extractedEvents && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}
