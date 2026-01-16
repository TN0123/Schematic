"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  MessageCircle,
  X,
  CircleArrowUp,
  ArrowUp,
  RefreshCw,
  UserPen,
  Eye,
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

  // Helper function to render chat input
  const renderChatInput = () => (
    <div className="flex items-center w-full px-4 sm:px-6 py-1 border border-gray-200 dark:border-dark-divider rounded-[2rem] bg-white dark:bg-dark-secondary shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] focus-within:ring-4 focus-within:ring-gray-900/5 dark:focus-within:ring-white/5 focus-within:border-gray-300 dark:focus-within:border-dark-divider transition-all duration-300 ease-in-out group">
      <textarea
        ref={inputRef}
        className="flex-1 py-2 sm:py-3 resize-none bg-transparent focus:outline-none dark:text-dark-textPrimary text-xs sm:text-sm placeholder-gray-400 dark:placeholder-dark-textDisabled"
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
          minHeight: "40px",
          maxHeight: "200px",
        }}
      />
      <div className="flex items-center ml-2">
        <button
          className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 flex items-center justify-center active:scale-95 ${
            chatInput.trim()
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm hover:opacity-90"
              : "text-gray-300 dark:text-dark-textDisabled"
          }`}
          onClick={handleChatSubmit}
          disabled={isChatLoading || !chatInput.trim()}
          title="Send message"
        >
          <ArrowUp size={18} className="stroke-[3]" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full max-w-4xl mx-auto">
        {/* Chat Input at top when no messages */}
        {chatMessages.length === 0 && (
          <div className="mb-4 sm:mb-8 flex-shrink-0 animate-fade-in">
            {renderChatInput()}
          </div>
        )}

        {/* Chat Messages Area */}
        <AnimatePresence mode="wait">
          {chatMessages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col"
            >
              <div
                ref={chatContainerRef}
                className="space-y-4 overflow-y-auto pb-4 max-h-[60vh] scroll-smooth"
              >
                <AnimatePresence mode="popLayout">
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                        y: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
                        layout: {
                          type: "spring",
                          bounce: 0.15,
                          duration: 0.4,
                        },
                      }}
                      style={{
                        originX: message.role === "user" ? 1 : 0,
                      }}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`p-4 rounded-[1.5rem] max-w-xs lg:max-w-md shadow-sm transition-all duration-300 ${
                          message.role === "user"
                            ? "bg-blue-500 text-white rounded-tr-none shadow-blue-500/10 hover:shadow-blue-500/20"
                            : message.isError
                            ? "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-tl-none"
                            : "bg-white dark:bg-dark-secondary border border-gray-100 dark:border-dark-divider rounded-tl-none shadow-black/5 hover:shadow-black/10"
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
                                        className="flex items-center text-xs text-gray-500 dark:text-dark-textDisabled bg-gray-100 dark:bg-dark-actionDisabledBackground px-2 py-1 rounded-full"
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

                <AnimatePresence>
                  {isChatLoading && (
                    <motion.div
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <div className="p-4 rounded-[1.5rem] rounded-tl-none bg-white dark:bg-dark-secondary border border-gray-100 dark:border-dark-divider shadow-sm">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Chat Input at bottom when messages exist */}
              <div className="mt-4 flex-shrink-0">{renderChatInput()}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
          gap: 5px;
          align-items: center;
          padding: 2px 4px;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #374151;
          opacity: 0.4;
          animation: typing 1.4s infinite ease-in-out;
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
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
