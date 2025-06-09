"use client";

import {
  Plus,
  FileUp,
  RefreshCw,
  PanelRightOpen,
  PanelRightClose,
  Mic,
  CalendarPlus,
} from "lucide-react";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Event } from "../page";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

interface EventGenerationPanelProps {
  setShowModal: (show: boolean) => void;
  setIsFileUploaderModalOpen: (open: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  dailySummary: string;
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
}: EventGenerationPanelProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
    resetTranscript();
    SpeechRecognition.startListening({ continuous: false });
  };

  return (
    <>
      <aside
        className={`hidden md:flex fixed md:relative z-30 h-full w-80 md:w-96 bg-white dark:bg-dark-background border-l dark:border-dark-divider px-6 py-4 flex-col gap-4 transition-all duration-300`}
      >
        {/* Menu Bar */}
        <div className="flex" id="event-menu-bar">
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
              className="absolute bottom-2 right-2 p-1 bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover rounded-full transition-colors duration-200"
              onClick={handleListen}
            >
              <Mic
                size={16}
                className="text-black dark:text-dark-textPrimary"
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
              <p className="text-lg text-gray-500 text-center font-bold dark:text-dark-textSecondary">
                Daily Summary
              </p>
              <div className="text-sm text-gray-500 dark:text-dark-textSecondary text-center prose dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: (props) => <p {...props} className="mt-4" />,
                  }}
                >
                  {dailySummary}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </>
  );
}
