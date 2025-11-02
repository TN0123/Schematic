"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  MessageCircle,
  X,
  CircleArrowUp,
  RefreshCw,
  UserPen,
  Eye,
  Pen,
  Check,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "model";
  content: string;
  contextUpdated?: boolean;
  toolCalls?: Array<{
    name: string;
    description: string;
    notes?: Array<{
      id: string;
      title: string;
      type?: string;
    }>;
  }>;
  contextChange?: {
    before: string;
    after: string;
  };
  isError?: boolean;
  isRetryable?: boolean;
  originalInput?: string;
}

interface DashboardChatProps {
  userId: string;
  onChatActiveChange?: (isActive: boolean) => void;
}

export default function DashboardChat({
  userId,
  onChatActiveChange,
}: DashboardChatProps) {
  const { data: session } = useSession();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [contextDiffModal, setContextDiffModal] = useState<{
    isOpen: boolean;
    before: string;
    after: string;
  }>({ isOpen: false, before: "", after: "" });
  const [assistantName, setAssistantName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoadingName, setIsLoadingName] = useState(true);

  const isChatActive = chatMessages.length > 0;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch assistant name on component mount
  useEffect(() => {
    const fetchAssistantName = async () => {
      try {
        const response = await fetch("/api/user/assistant-name");
        if (response.ok) {
          const data = await response.json();
          setAssistantName(data.assistantName);
        } else {
          // Fallback to default name if API fails
          setAssistantName("AI Life Assistant");
        }
      } catch (error) {
        console.error("Error fetching assistant name:", error);
        // Fallback to default name if API fails
        setAssistantName("AI Life Assistant");
      } finally {
        setIsLoadingName(false);
      }
    };
    fetchAssistantName();
  }, []);

  // Notify parent when chat becomes active/inactive
  const handleChatActiveChange = useCallback(
    (active: boolean) => {
      onChatActiveChange?.(active);
    },
    [onChatActiveChange]
  );

  useEffect(() => {
    handleChatActiveChange(isChatActive);
  }, [isChatActive, handleChatActiveChange]);

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
      const goalsView = (
        typeof window !== "undefined"
          ? localStorage.getItem("goals-panel-active-tab")
          : null
      ) as "list" | "text" | "todo" | null;

      const res = await fetch("/api/schedule/chat", {
        method: "POST",
        body: JSON.stringify({
          instructions: currentChatInput,
          history: chatMessages,
          userId,
          timezone: userTimezone,
          goalsView: goalsView || "list",
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
    setChatMessages((prev) => prev.slice(0, -1));
  };

  const handleEditName = () => {
    setTempName(assistantName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (tempName.trim() === assistantName) {
      setIsEditingName(false);
      return;
    }

    // Client-side sanitization
    const sanitizedName = tempName
      .trim()
      .replace(/["'`\\]/g, "") // Remove quotes and backslashes
      .replace(/[\r\n\t]/g, " ") // Replace newlines and tabs with spaces
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .substring(0, 50); // Ensure max length

    if (sanitizedName.length === 0) {
      alert("Assistant name contains only invalid characters");
      return;
    }

    try {
      const response = await fetch("/api/user/assistant-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantName: sanitizedName }),
      });

      if (response.ok) {
        const data = await response.json();
        setAssistantName(data.assistantName);
        setIsEditingName(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update assistant name");
      }
    } catch (error) {
      console.error("Error updating assistant name:", error);
      alert("Failed to update assistant name");
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setTempName("");
  };

  return (
    <>
      {/* Chat Bar - Always visible at top */}
      <div className="w-full max-w-4xl mx-auto mb-4 sm:mb-8">
        {/* Assistant Profile Header */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-3 sm:mb-4 relative">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <motion.div
              className="flex-shrink-0 flex items-center justify-center"
              animate={{
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <User
                size={20}
                className="sm:hidden stroke-[1.5] text-gray-900 dark:text-gray-100"
                style={{
                  stroke: "currentColor",
                }}
              />
              <User
                size={24}
                className="hidden sm:block stroke-[1.5] text-gray-900 dark:text-gray-100"
                style={{
                  stroke: "currentColor",
                }}
              />
            </motion.div>
            <div className="flex items-center gap-1 sm:gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveName();
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    className="px-2 py-1 text-base sm:text-lg font-semibold bg-transparent border border-gray-300 dark:border-dark-divider rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-dark-textPrimary w-full max-w-[200px] sm:max-w-none"
                    autoFocus
                    maxLength={50}
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded transition-colors duration-200"
                    title="Save name"
                  >
                    <Check
                      size={14}
                      className="text-green-600 dark:text-green-400 sm:hidden"
                    />
                    <Check
                      size={16}
                      className="text-green-600 dark:text-green-400 hidden sm:block"
                    />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded transition-colors duration-200"
                    title="Cancel"
                  >
                    <X
                      size={14}
                      className="text-gray-500 dark:text-dark-textSecondary sm:hidden"
                    />
                    <X
                      size={16}
                      className="text-gray-500 dark:text-dark-textSecondary hidden sm:block"
                    />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  {isLoadingName ? (
                    <div className="h-5 sm:h-6 w-32 sm:w-40 bg-gray-200 dark:bg-dark-secondary rounded animate-pulse"></div>
                  ) : (
                    <>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-textPrimary truncate">
                        {assistantName}
                      </h3>
                      <button
                        onClick={handleEditName}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded transition-colors duration-200 flex-shrink-0"
                        title="Edit assistant name"
                      >
                        <Pen
                          size={12}
                          className="text-gray-500 dark:text-dark-textSecondary sm:hidden"
                        />
                        <Pen
                          size={14}
                          className="text-gray-500 dark:text-dark-textSecondary hidden sm:block"
                        />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {chatMessages.length > 0 && (
            <button
              onClick={() => setChatMessages([])}
              className="absolute right-0 p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-lg transition-colors duration-200 text-gray-500 dark:text-dark-textSecondary flex-shrink-0"
              title="Clear chat"
            >
              <RefreshCw size={16} className="sm:hidden" />
              <RefreshCw size={18} className="hidden sm:block" />
            </button>
          )}
        </div>

        {/* Chat Input */}
        <div className="relative">
          <textarea
            ref={inputRef}
            className="w-full p-3 sm:p-4 pr-12 sm:pr-32 resize-none border-2 dark:border-dark-divider rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-dark-secondary dark:text-dark-textPrimary text-sm sm:text-base placeholder-gray-400 dark:placeholder-dark-textDisabled shadow-lg transition-all duration-200"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
              }
            }}
            placeholder="Ask anything..."
            rows={1}
            disabled={isChatLoading}
            style={{
              minHeight: "48px",
              maxHeight: "200px",
            }}
          />
          <div className="absolute right-1.5 sm:right-2 top-2 sm:top-3 flex items-center gap-1 sm:gap-2">
            <button
              className="p-1.5 sm:p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 flex items-center justify-center"
              onClick={handleChatSubmit}
              disabled={isChatLoading || !chatInput.trim()}
              title="Send message"
            >
              <CircleArrowUp size={16} className="sm:hidden" />
              <CircleArrowUp size={20} className="hidden sm:block" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <AnimatePresence>
        {chatMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl mx-auto"
          >
            <div ref={chatContainerRef} className="space-y-4 pb-6 sm:pb-8">
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
                                className="flex flex-col gap-1"
                              >
                                <div
                                  className="flex items-center text-xs text-gray-500 dark:text-dark-textDisabled bg-gray-100 dark:bg-dark-actionDisabledBackground px-2 py-1 rounded-full"
                                  title={`Tool used: ${toolCall.name}`}
                                >
                                  <Eye size={10} className="mr-1" />
                                  <span>{toolCall.description}</span>
                                </div>
                                {/* Display note bubbles for bulletin notes */}
                                {toolCall.name === "search_bulletin_notes" &&
                                  toolCall.notes &&
                                  toolCall.notes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {toolCall.notes.map((note, noteIndex) => (
                                        <div
                                          key={noteIndex}
                                          className="inline-flex items-center text-xs bg-gray-100 dark:bg-dark-secondary px-2 py-1 rounded-full border border-gray-300 dark:border-dark-divider"
                                        >
                                          <span className="text-gray-600 dark:text-dark-textSecondary mr-1">
                                            Read
                                          </span>
                                          <a
                                            href={`/bulletin?noteId=${note.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 dark:text-green-400 underline hover:text-green-700 dark:hover:text-green-300 transition-colors duration-200"
                                            title={`Read ${note.title}`}
                                          >
                                            {note.title}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Diff Modal */}
      {contextDiffModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setContextDiffModal({ isOpen: false, before: "", after: "" });
            }
          }}
        >
          <div
            className="bg-white dark:bg-dark-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-dark-divider">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                Context Changes
              </h2>
              <button
                onClick={() =>
                  setContextDiffModal({ isOpen: false, before: "", after: "" })
                }
                className="text-gray-500 hover:text-gray-700 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary p-1"
              >
                <X size={20} className="sm:hidden" />
                <X size={24} className="hidden sm:block" />
              </button>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(80vh-180px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <span className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full mr-2"></span>
                    Before
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap min-h-[150px] sm:min-h-[200px] max-h-[calc(90vh-200px)] sm:max-h-[calc(80vh-260px)] overflow-y-auto border">
                    {contextDiffModal.before || "No previous context"}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                    <span className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full mr-2"></span>
                    After
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap min-h-[150px] sm:min-h-[200px] max-h-[calc(90vh-200px)] sm:max-h-[calc(80vh-260px)] overflow-y-auto border">
                    {contextDiffModal.after}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center p-4 sm:p-6 border-t dark:border-dark-divider gap-2 sm:gap-3">
              <button
                onClick={() =>
                  setContextDiffModal({ isOpen: false, before: "", after: "" })
                }
                className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-dark-secondary dark:text-dark-textPrimary dark:hover:bg-dark-hover transition text-sm sm:text-base"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/schedule/context", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        userId,
                        context: contextDiffModal.before,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error("Failed to revert schedule context");
                    }

                    setContextDiffModal({
                      isOpen: false,
                      before: "",
                      after: "",
                    });
                  } catch (error) {
                    console.error("Failed to revert schedule context", error);
                  }
                }}
                className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition text-sm sm:text-base"
              >
                Reject Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Typing indicator styles */}
      <style jsx global>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #9ca3af;
          animation: typing 1.4s infinite;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </>
  );
}
