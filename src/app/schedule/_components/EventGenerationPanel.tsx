"use client";

import {
  Plus,
  FileUp,
  PanelRightClose,
  Mic,
  CalendarPlus,
  RefreshCw,
  UserPen,
  MessageCircle,
  CircleArrowUp,
  Eye,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import ScheduleContextModal from "./ScheduleContextModal";

interface ChatMessage {
  role: "user" | "model";
  content: string;
  contextUpdated?: boolean;
  toolCalls?: Array<{
    name: string;
    description: string;
  }>;
  contextChange?: {
    before: string;
    after: string;
  };
  isError?: boolean;
  isRetryable?: boolean;
  originalInput?: string;
}

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
  const [activeTab, setActiveTab] = useState<"generate" | "chat">("generate");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [contextDiffModal, setContextDiffModal] = useState<{
    isOpen: boolean;
    before: string;
    after: string;
  }>({ isOpen: false, before: "", after: "" });

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false });
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: chatInput },
    ];
    setChatMessages(newMessages);
    const currentChatInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/schedule/chat", {
        method: "POST",
        body: JSON.stringify({
          instructions: currentChatInput,
          history: chatMessages,
          userId,
          timezone: userTimezone,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      const { response, contextUpdated, toolCalls, contextChange } =
        await res.json();
      setChatMessages([
        ...newMessages,
        {
          role: "model",
          content: response,
          contextUpdated,
          toolCalls,
          contextChange,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      let errorMessage =
        "Sorry, I'm having trouble connecting. Please try again later.";
      let isRetryable = true;

      if (error instanceof Error) {
        if (
          error.message.includes("Missing instructions, userId, or timezone")
        ) {
          errorMessage =
            "There was a configuration error. Please refresh the page and try again.";
          isRetryable = false;
        } else if (error.message.includes("HTTP 500")) {
          errorMessage =
            "The AI service is temporarily unavailable. Please try again in a moment.";
        } else if (error.message.includes("HTTP 400")) {
          errorMessage =
            "There was an issue with your request. Please try rephrasing your message.";
        } else if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError")
        ) {
          errorMessage =
            "Network connection error. Please check your internet connection and try again.";
        }
      }

      setChatMessages([
        ...newMessages,
        {
          role: "model",
          content: errorMessage,
          isError: true,
          isRetryable,
          originalInput: currentChatInput,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRetryMessage = (originalInput: string) => {
    setChatInput(originalInput);
    // Remove the error message and retry
    setChatMessages((prev) => prev.slice(0, -1));
  };

  return (
    <>
      <aside
        className={`hidden md:flex fixed md:relative z-30 h-full w-80 md:w-96 bg-white dark:bg-dark-background border-l dark:border-dark-divider px-6 py-4 flex-col gap-4 transition-all duration-300`}
      >
        {/* Tab Navigation */}
        <div className="flex border-b dark:border-dark-divider">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === "generate"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 dark:hover:text-dark-textPrimary hover:border-gray-300 dark:hover:border-dark-divider"
            }`}
          >
            <CalendarPlus size={16} />
            Generate
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            id="ai-chat-tab-button"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === "chat"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-dark-textSecondary hover:text-gray-700 dark:hover:text-dark-textPrimary hover:border-gray-300 dark:hover:border-dark-divider"
            }`}
          >
            <MessageCircle size={16} />
            AI Chat
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "generate" && (
          <>
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
                  placeholder="Enter your events and reminders here..."
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
                    <div className="text-sm text-gray-500 dark:text-dark-textSecondary text-center prose dark:prose-invert whitespace-pre-line max-h-64 overflow-y-auto">
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
          </>
        )}

        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Chat Header with Context Button */}
            <div className="flex justify-start">
              <button
                className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2 rounded"
                onClick={() => {
                  setIsScheduleContextModalOpen(true);
                  setIsMobileOpen(false);
                }}
                title="Edit AI Context"
              >
                <UserPen size={20} />
              </button>
              <button
                className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2 rounded"
                onClick={() => setChatMessages([])}
                title="Clear chat"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2"
            >
              <AnimatePresence>
                {chatMessages.map((message, index) => (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 50 }}
                    transition={{
                      opacity: { duration: 0.2 },
                      layout: {
                        type: "spring",
                        bounce: 0.4,
                        duration: 0.3,
                      },
                    }}
                    style={{
                      originX: message.role === "user" ? 1 : 0,
                    }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-xs lg:max-w-md ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : message.isError
                          ? "bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700"
                          : "bg-gray-200 dark:bg-dark-secondary"
                      }`}
                    >
                      <div className="text-sm prose dark:prose-invert max-w-none prose-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: (props) => (
                              <p
                                {...props}
                                className={`mb-2 last:mb-0 ${
                                  message.isError
                                    ? "text-red-800 dark:text-red-200"
                                    : ""
                                }`}
                              />
                            ),
                            ul: (props) => (
                              <ul {...props} className="mb-2 last:mb-0 pl-4" />
                            ),
                            ol: (props) => (
                              <ol {...props} className="mb-2 last:mb-0 pl-4" />
                            ),
                            li: (props) => <li {...props} className="mb-1" />,
                            code: (props) => (
                              <code
                                {...props}
                                className={`px-1 py-0.5 rounded text-xs ${
                                  message.role === "user"
                                    ? "bg-blue-600 text-blue-100"
                                    : "bg-gray-300 dark:bg-dark-background text-gray-800 dark:text-dark-textPrimary"
                                }`}
                              />
                            ),
                            pre: (props) => (
                              <pre
                                {...props}
                                className={`p-2 rounded text-xs overflow-x-auto ${
                                  message.role === "user"
                                    ? "bg-blue-600"
                                    : "bg-gray-300 dark:bg-dark-background"
                                }`}
                              />
                            ),
                            blockquote: (props) => (
                              <blockquote
                                {...props}
                                className={`border-l-2 pl-2 italic ${
                                  message.role === "user"
                                    ? "border-blue-300"
                                    : "border-gray-400 dark:border-dark-divider"
                                }`}
                              />
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {message.isError &&
                        message.isRetryable &&
                        message.originalInput && (
                          <button
                            onClick={() =>
                              handleRetryMessage(message.originalInput!)
                            }
                            className="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors duration-200 flex items-center gap-1"
                          >
                            <RefreshCw size={12} />
                            Retry
                          </button>
                        )}
                      <div className="flex flex-col gap-1 mt-2">
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {message.toolCalls.map((toolCall, toolIndex) => (
                              <div
                                key={toolIndex}
                                className="flex items-center text-xs text-gray-500 dark:text-dark-textDisabled bg-gray-100 dark:bg-dark-actionDisabledBackground px-2 py-1 rounded-full"
                                title={`Tool used: ${toolCall.name}`}
                              >
                                <Eye size={10} className="mr-1" />
                                <span>{toolCall.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {message.contextUpdated && (
                          <button
                            className="flex items-center justify-end text-xs text-gray-500 dark:text-dark-textDisabled hover:text-gray-700 dark:hover:text-dark-textPrimary transition-colors duration-200 cursor-pointer"
                            title="Click to see context changes"
                            onClick={() => {
                              if (message.contextChange) {
                                setContextDiffModal({
                                  isOpen: true,
                                  before: message.contextChange.before,
                                  after: message.contextChange.after,
                                });
                              }
                            }}
                          >
                            <UserPen size={12} className="mr-1" />
                            <span>Context Updated</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isChatLoading && (
                <div className="flex justify-start">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-3 rounded-lg bg-gray-200 dark:bg-dark-secondary"
                  >
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </motion.div>
                </div>
              )}
              {chatMessages.length === 0 && !isChatLoading && (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <MessageCircle
                    size={48}
                    className="text-gray-400 dark:text-dark-textDisabled mb-4"
                  />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-dark-textPrimary mb-2">
                    AI Life Assistant
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                    Chat with your AI assistant to manage your schedule, get
                    recommendations, and more.
                  </p>
                </div>
              )}
            </div>
            <div className="relative">
              <textarea
                className="flex w-full p-4 pr-12 h-auto max-h-40 resize-none border dark:border-dark-divider placeholder-gray-500 dark:placeholder-dark-textDisabled rounded-xl focus:outline-none bg-transparent dark:text-dark-textPrimary text-sm"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                placeholder="Chat with your AI assistant..."
              />
              <button
                className="absolute bottom-3 right-3 rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-blue-500 dark:text-blue-400 transition-colors duration-200 p-2"
                onClick={handleChatSubmit}
                disabled={isChatLoading || !chatInput.trim()}
              >
                <CircleArrowUp size={20} />
              </button>
            </div>
          </div>
        )}
      </aside>
      {/* Context Diff Modal */}
      {contextDiffModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setContextDiffModal({ isOpen: false, before: "", after: "" });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setContextDiffModal({ isOpen: false, before: "", after: "" });
            }
          }}
          tabIndex={-1}
        >
          <div
            className="bg-white dark:bg-dark-background rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b dark:border-dark-divider">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                Context Changes
              </h2>
              <button
                onClick={() =>
                  setContextDiffModal({ isOpen: false, before: "", after: "" })
                }
                className="text-gray-500 hover:text-gray-700 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-3 flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Before
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap min-h-[200px] border">
                    {contextDiffModal.before || "No previous context"}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    After
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap min-h-[200px] border">
                    {contextDiffModal.after}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScheduleContextModal
        isOpen={isScheduleContextModalOpen}
        onClose={() => setIsScheduleContextModalOpen(false)}
        userId={userId}
      />
    </>
  );
}
