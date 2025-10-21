"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  CircleArrowUp,
  RefreshCw,
  UserPen,
  Eye,
  Pen,
  Check,
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
}

export default function DashboardChat({ userId }: DashboardChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [contextDiffModal, setContextDiffModal] = useState<{
    isOpen: boolean;
    before: string;
    after: string;
  }>({ isOpen: false, before: "", after: "" });
  const [assistantName, setAssistantName] = useState("AI Life Assistant");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

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
        }
      } catch (error) {
        console.error("Error fetching assistant name:", error);
      }
    };
    fetchAssistantName();
  }, []);

  // Handle body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll and add class for mobile
      document.body.style.overflow = "hidden";
      document.body.classList.add("chat-open");
    } else {
      // Restore body scroll and remove class
      document.body.style.overflow = "unset";
      document.body.classList.remove("chat-open");
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("chat-open");
    };
  }, [isOpen]);

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
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 md:bottom-6 bottom-20 right-6 z-40 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-colors duration-200 flex items-center gap-2"
            title="Chat with AI Assistant"
          >
            <MessageCircle size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
            />

            {/* Chat Window */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
                opacity: { duration: 0.15 },
              }}
              className="fixed bottom-6 md:bottom-6 bottom-20 right-6 z-50 w-[90vw] md:w-96 h-[80vh] md:h-[600px] bg-white dark:bg-dark-background border border-gray-200 dark:border-dark-divider rounded-2xl shadow-2xl flex flex-col overflow-hidden chat-panel-container"
              style={{
                maxHeight: "calc(100vh - 3rem)",
                maxWidth: "calc(100vw - 3rem)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b dark:border-dark-divider">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
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
                        className="px-2 py-1 text-sm font-semibold bg-transparent border border-gray-300 dark:border-dark-divider rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-dark-textPrimary"
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
                          className="text-green-600 dark:text-green-400"
                        />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded transition-colors duration-200"
                        title="Cancel"
                      >
                        <X
                          size={14}
                          className="text-gray-500 dark:text-dark-textSecondary"
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-dark-textPrimary">
                        {assistantName}
                      </h3>
                      <button
                        onClick={handleEditName}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded transition-colors duration-200"
                        title="Edit assistant name"
                      >
                        <Pen
                          size={14}
                          className="text-gray-500 dark:text-dark-textSecondary"
                        />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChatMessages([])}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-lg transition-colors duration-200"
                    title="Clear chat"
                  >
                    <RefreshCw size={18} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-lg transition-colors duration-200"
                    title="Close chat"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {chatMessages.length === 0 && !isChatLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <MessageCircle
                      size={48}
                      className="text-gray-400 dark:text-dark-textDisabled mb-4"
                    />
                    <h4 className="text-lg font-medium text-gray-700 dark:text-dark-textPrimary mb-2">
                      Welcome!
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                      Ask me about your schedule, goals, notes, or anything else
                      you need help with.
                    </p>
                  </div>
                )}

                <AnimatePresence>
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          message.role === "user"
                            ? "bg-blue-500 text-white rounded-br-sm"
                            : message.isError
                            ? "bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-bl-sm"
                            : "bg-gray-100 dark:bg-dark-secondary rounded-bl-sm"
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
                                      : message.role === "user"
                                      ? "text-white"
                                      : "text-gray-800 dark:text-dark-textPrimary"
                                  }`}
                                />
                              ),
                              ul: (props) => (
                                <ul
                                  {...props}
                                  className="mb-2 last:mb-0 pl-4"
                                />
                              ),
                              ol: (props) => (
                                <ol
                                  {...props}
                                  className="mb-2 last:mb-0 pl-4"
                                />
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

                        {/* Tool calls and context updates */}
                        {(message.toolCalls?.length ||
                          message.contextUpdated) && (
                          <div className="flex flex-col gap-1 mt-2">
                            {message.toolCalls &&
                              message.toolCalls.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {message.toolCalls.map(
                                    (toolCall, toolIndex) => (
                                      <div
                                        key={toolIndex}
                                        className="flex flex-col gap-1"
                                      >
                                        <div
                                          className="flex items-center text-xs text-gray-600 dark:text-dark-textDisabled bg-white dark:bg-dark-actionDisabledBackground px-2 py-1 rounded-full"
                                          title={`Tool used: ${toolCall.name}`}
                                        >
                                          <Eye size={10} className="mr-1" />
                                          <span>{toolCall.description}</span>
                                        </div>
                                        {/* Display note bubbles for bulletin notes */}
                                        {toolCall.name ===
                                          "search_bulletin_notes" &&
                                          toolCall.notes &&
                                          toolCall.notes.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {toolCall.notes.map(
                                                (note, noteIndex) => (
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
                                                )
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            {message.contextUpdated && (
                              <button
                                className="flex items-center text-xs text-gray-600 dark:text-dark-textDisabled hover:text-gray-800 dark:hover:text-dark-textPrimary transition-colors duration-200"
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
                                <UserPen size={10} className="mr-1" />
                                <span>Context Updated</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isChatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="p-3 rounded-2xl rounded-bl-sm bg-gray-100 dark:bg-dark-secondary">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t dark:border-dark-divider">
                <div className="relative">
                  <textarea
                    className="w-full p-3 pr-12 resize-none border dark:border-dark-divider rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent dark:text-dark-textPrimary text-sm placeholder-gray-400 dark:placeholder-dark-textDisabled"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder="Ask me anything..."
                    rows={2}
                    disabled={isChatLoading}
                  />
                  <button
                    className="absolute bottom-2 right-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover text-blue-500 dark:text-blue-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatInput.trim()}
                  >
                    <CircleArrowUp size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Context Diff Modal */}
      {contextDiffModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setContextDiffModal({ isOpen: false, before: "", after: "" });
            }
          }}
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
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-3 flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Before
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap min-h-[200px] max-h-[calc(80vh-260px)] overflow-y-auto border">
                    {contextDiffModal.before || "No previous context"}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    After
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap min-h-[200px] max-h-[calc(80vh-260px)] overflow-y-auto border">
                    {contextDiffModal.after}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center p-6 border-t dark:border-dark-divider gap-3">
              <button
                onClick={() =>
                  setContextDiffModal({ isOpen: false, before: "", after: "" })
                }
                className="px-4 py-2 rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-dark-secondary dark:text-dark-textPrimary dark:hover:bg-dark-hover transition"
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
                className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition"
              >
                Reject Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add typing indicator styles and prevent scrollbar flicker */}
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

        /* Prevent scrollbar flicker during animations */
        body {
          scrollbar-gutter: stable;
          overflow-x: hidden;
        }

        /* Ensure smooth transitions without scrollbar jumps */
        @media (max-width: 768px) {
          body.chat-open {
            overflow: hidden;
            position: fixed;
            width: 100%;
          }
        }

        /* Prevent horizontal scroll during chat animations */
        html,
        body {
          overflow-x: hidden;
        }

        /* Ensure chat panel doesn't cause horizontal overflow */
        .chat-panel-container {
          overflow-x: hidden;
          max-width: 100vw;
        }
      `}</style>
    </>
  );
}
