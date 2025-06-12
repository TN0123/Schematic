"use client";

import {
  Plus,
  FileUp,
  PanelRightClose,
  Mic,
  CalendarPlus,
  RefreshCw,
  UserPen,
} from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import ScheduleContextModal from "./ScheduleContextModal";

interface EventGenerationPanelProps {
  setShowModal: (show: boolean) => void;
  setIsFileUploaderModalOpen: (open: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  dailySummary: string;
  dailySummaryDate: Date | null;
  dailySummaryLoading: boolean;
  userId: string;
}

export default function EventGenerationPanel({
  setShowModal,
  setIsFileUploaderModalOpen,
  setIsIcsUploaderModalOpen,
  inputText,
  setInputText,
  loading,
  handleSubmit,
  dailySummary,
  dailySummaryDate,
  dailySummaryLoading,
  userId,
}: EventGenerationPanelProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScheduleContextModalOpen, setIsScheduleContextModalOpen] =
    useState(false);
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

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false });
    }
  };

  return (
    <>
      <aside
        className={`hidden md:flex fixed md:relative z-30 h-full w-80 md:w-96 bg-white dark:bg-dark-background border-l dark:border-dark-divider px-6 py-4 flex-col gap-4 transition-all duration-300`}
      >
        {/* Menu Bar */}
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
                setIsFileUploaderModalOpen(true);
                setIsMobileOpen(false);
              }}
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

        <div id="event-adder">
          <div className="relative">
            <textarea
              className="flex w-full p-4 h-auto resize-none border dark:border-dark-divider placeholder-gray-500 dark:placeholder-dark-textDisabled rounded-xl focus:outline-none bg-transparent dark:text-dark-textPrimary text-sm"
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
              placeholder="Enter your schedule here..."
            />
            <button
              className={`absolute bottom-2 right-2 p-1 rounded-full transition-colors duration-200 ${
                listening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover"
              }`}
              onClick={handleListen}
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
          </div>

          <button
            className="w-full py-2 mt-2 rounded-lg bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            disabled={loading}
            onClick={() => {
              handleSubmit();
              setIsMobileOpen(false);
            }}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        <AnimatePresence>
          {dailySummary && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col gap-2 mt-4"
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
                <div className="text-sm text-gray-500 dark:text-dark-textSecondary text-center prose dark:prose-invert whitespace-pre-line">
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
      </aside>
      <ScheduleContextModal
        isOpen={isScheduleContextModalOpen}
        onClose={() => setIsScheduleContextModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
