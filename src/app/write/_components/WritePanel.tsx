import {
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  CircleArrowUp,
  UserPen,
  Info,
  AlertCircle,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChangeMap } from "./WriteEditor";
import { motion, AnimatePresence } from "framer-motion";
import ContextModal from "./ContextModal";

export type ModelType = "basic" | "premium";

interface MessageProps {
  message: string;
  role: "user" | "assistant";
  contextUpdated?: boolean;
  contextChange?: {
    before: string;
    after: string;
  };
}

interface ErrorState {
  message: string;
  type: "network" | "server" | "auth" | "validation" | "unknown";
}

interface ToastNotification {
  id: string;
  message: string;
  type: "error" | "success" | "warning" | "info";
  duration?: number;
}

// Typing animation component
function TypingIndicator() {
  return (
    <div className="flex w-full justify-start">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-[85%] p-3 rounded-xl my-2 bg-gray-50 dark:bg-dark-paper text-left"
      >
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <motion.div
              className="w-2 h-2 bg-gray-400 dark:bg-dark-textPrimary rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0,
              }}
            />
            <motion.div
              className="w-2 h-2 bg-gray-400 dark:bg-dark-textPrimary rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
            <motion.div
              className="w-2 h-2 bg-gray-400 dark:bg-dark-textPrimary rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-dark-textDisabled ml-2">
            AI is typing...
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export function Message({
  message,
  role,
  contextUpdated,
  contextChange,
}: MessageProps & {
  onShowContextDiff?: (before: string, after: string) => void;
}) {
  return (
    <div
      className={`flex w-full ${
        role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`max-w-[85%] p-3 rounded-xl my-2 ${
          role === "user"
            ? "bg-blue-50 dark:bg-dark-secondary text-right"
            : "bg-gray-50 dark:bg-dark-paper text-left"
        }`}
      >
        <p className="text-gray-900 dark:text-dark-textPrimary text-xs">
          {message}
        </p>
        {contextUpdated && contextChange && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-divider">
            <button
              className="flex items-center justify-end text-xs text-gray-500 dark:text-dark-textDisabled hover:text-gray-700 dark:hover:text-dark-textPrimary transition-colors duration-200 cursor-pointer"
              title="Click to see context changes"
              onClick={() => {
                const event = new CustomEvent("showContextDiff", {
                  detail: contextChange,
                });
                window.dispatchEvent(event);
              }}
            >
              <UserPen size={12} className="mr-1" />
              <span>Context Updated</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function WritePanel({
  inputText,
  setChanges,
  selected,
  lastRequest,
  setLastRequest,
  userId,
  documentId,
  premiumRemainingUses,
  setPremiumRemainingUses,
  onModelChange,
  onImproveStart,
}: {
  inputText: string;
  setChanges: (changes: ChangeMap) => void;
  selected: string;
  lastRequest: {
    input: string;
    selected: string;
    instructions: string;
    history: { role: "user" | "model"; parts: string }[];
    actionMode: "ask" | "edit";
  } | null;
  setLastRequest: (
    request: {
      input: string;
      selected: string;
      instructions: string;
      history: { role: "user" | "model"; parts: string }[];
      actionMode: "ask" | "edit";
    } | null
  ) => void;
  userId: string | undefined;
  documentId: any;
  premiumRemainingUses: number | null;
  setPremiumRemainingUses: (remainingUses: number) => void;
  onModelChange: (model: ModelType) => void;
  onImproveStart: () => void;
}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [history, setHistory] = useState<
    { role: "user" | "model"; parts: string }[]
  >([]);
  const [isImproving, setIsImproving] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>("premium");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [contextDiffModal, setContextDiffModal] = useState<{
    isOpen: boolean;
    before: string;
    after: string;
  }>({ isOpen: false, before: "", after: "" });
  const [actionMode, setActionMode] = useState<"ask" | "edit">("edit");
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Helper function to add toast notifications
  const addToast = (
    message: string,
    type: ToastNotification["type"] = "error",
    duration = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: ToastNotification = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  };

  // Helper function to remove toast
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper function to parse API errors
  const parseApiError = async (response: Response): Promise<ErrorState> => {
    let message = "An unexpected error occurred";
    let type: ErrorState["type"] = "unknown";

    try {
      const errorData = await response.json();
      message = errorData.error || errorData.message || message;
    } catch {
      // If we can't parse the error response, use status-based messages
      switch (response.status) {
        case 400:
          message = "Invalid request. Please check your input and try again.";
          type = "validation";
          break;
        case 401:
          message = "Authentication required. Please log in and try again.";
          type = "auth";
          break;
        case 403:
          message = "Access denied. You may have reached your usage limit.";
          type = "auth";
          break;
        case 429:
          message = "Too many requests. Please wait a moment and try again.";
          type = "server";
          break;
        case 500:
          message = "Server error. Please try again in a moment.";
          type = "server";
          break;
        case 503:
          message = "Service temporarily unavailable. Please try again later.";
          type = "server";
          break;
        default:
          message = `Request failed with status ${response.status}`;
          type = "server";
      }
    }

    return { message, type };
  };

  // Helper function to handle network errors
  const handleNetworkError = (error: Error): ErrorState => {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return {
        message:
          "Network connection failed. Please check your internet connection and try again.",
        type: "network",
      };
    }

    return {
      message: error.message || "An unexpected error occurred",
      type: "unknown",
    };
  };

  useEffect(() => {
    onModelChange(selectedModel);
  }, [selectedModel, onModelChange]);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM has updated and scroll at the right time
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      }, 100); // Increased timeout to account for message animations
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Additional effect to handle scrolling when loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [isChatLoading, scrollToBottom]);

  // Listen for context diff events
  useEffect(() => {
    const handleShowContextDiff = (event: CustomEvent) => {
      const { before, after } = event.detail;
      setContextDiffModal({
        isOpen: true,
        before,
        after,
      });
    };

    window.addEventListener(
      "showContextDiff",
      handleShowContextDiff as EventListener
    );

    return () => {
      window.removeEventListener(
        "showContextDiff",
        handleShowContextDiff as EventListener
      );
    };
  }, []);

  const handleSubmit = async () => {
    if (!instructions.trim()) return;

    const requestPayload = {
      input: inputText,
      selected,
      instructions,
      history,
      actionMode,
    };

    const userMessage = { message: instructions, role: "user" as const };
    setMessages((prev) => [...prev, userMessage]);
    setInstructions("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentText: selected || inputText,
          instructions: `${instructions}`,
          history,
          userId,
          documentId,
          model: selectedModel,
          actionMode,
        }),
      });

      if (!response.ok) {
        const errorState = await parseApiError(response);
        addToast(errorState.message, "error");
        return;
      }

      const data = await response.json();
      if (data.remainingUses !== null) {
        setPremiumRemainingUses(data.remainingUses);
      }

      const assistantMessage = {
        message: actionMode === "ask" ? data.result : data.result[0],
        role: "assistant" as const,
        contextUpdated: data.contextUpdated,
        contextChange: data.contextChange,
      };
      setLastRequest(requestPayload);
      setMessages((prev) => [...prev, assistantMessage]);

      // Only apply changes for "edit" mode
      if (actionMode === "edit") {
        setChanges(data.result[1]);
      }

      setHistory(data.history);
    } catch (error) {
      console.error(error);
      const errorState = handleNetworkError(error as Error);
      addToast(errorState.message, "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!selected) return;
    onImproveStart();
    setIsImproving(true);

    try {
      const getSurroundingWords = (
        text: string,
        selected: string,
        wordCount: number
      ) => {
        const selectedStartIndex = text.indexOf(selected.trim());
        const selectedEndIndex = selectedStartIndex + selected.trim().length;

        const beforeWords = text
          .slice(0, selectedStartIndex)
          .split(/\s+/)
          .slice(-wordCount)
          .join(" ");

        const afterWords = text
          .slice(selectedEndIndex)
          .split(/\s+/)
          .slice(0, wordCount)
          .join(" ");

        return {
          before: beforeWords,
          after: afterWords,
        };
      };

      const { before, after } = getSurroundingWords(inputText, selected, 25);

      const response = await fetch("/api/chat/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          before,
          selected,
          after,
          userId,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const errorState = await parseApiError(response);
        addToast(errorState.message, "error");
        return;
      }

      const data = await response.json();
      if (data.remainingUses !== null) {
        setPremiumRemainingUses(data.remainingUses);
      }
      setChanges(data.result);
    } catch (error) {
      console.error(error);
      const errorState = handleNetworkError(error as Error);
      addToast(errorState.message, "error");
    } finally {
      setIsImproving(false);
    }
  };

  const handleRetry = async () => {
    if (!lastRequest) return;

    const {
      input,
      selected,
      instructions,
      history,
      actionMode: retryActionMode,
    } = lastRequest;

    setMessages((prev) => {
      const trimmed = [...prev];
      if (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
        trimmed.pop();
      }
      return trimmed;
    });

    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentText: selected || input,
          instructions,
          history,
          model: selectedModel,
          userId,
          documentId,
          actionMode: retryActionMode,
        }),
      });

      if (!response.ok) {
        const errorState = await parseApiError(response);
        addToast(errorState.message, "error");
        return;
      }

      const data = await response.json();

      const assistantMessage = {
        message: retryActionMode === "ask" ? data.result : data.result[0],
        role: "assistant" as const,
        contextUpdated: data.contextUpdated,
        contextChange: data.contextChange,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Only apply changes for "edit" mode
      if (retryActionMode === "edit") {
        setChanges(data.result[1]);
      }

      setHistory(data.history);
    } catch (error) {
      console.error(error);
      const errorState = handleNetworkError(error as Error);
      addToast(errorState.message, "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "i") {
        event.preventDefault();
        handleImprove();
      }
    },
    [handleImprove]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <aside
      className={`${
        isCollapsed ? "w-14" : "w-1/3"
      } h-full border-l-2 border-gray-300 dark:border-dark-divider bg-white dark:bg-dark-background flex flex-col transition-all duration-200`}
      id="write-panel"
    >
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-[400px] transition-all duration-300 ${
              toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800 dark:bg-dark-secondary dark:border-dark-divider dark:text-red-300"
                : toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-dark-secondary dark:border-dark-divider dark:text-green-300"
                : toast.type === "warning"
                ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-dark-secondary dark:border-dark-divider dark:text-yellow-300"
                : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-dark-secondary dark:border-dark-divider dark:text-blue-300"
            }`}
          >
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.type === "success" && (
              <Sparkles className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.type === "warning" && (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-black/10 dark:hover:bg-dark-actionHover rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-dark-divider transition-all">
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover transition-colors duration-200 ${
              isCollapsed ? "" : "p-2"
            }`}
          >
            {isCollapsed ? (
              <PanelRightOpen
                size={24}
                className="text-gray-700 dark:text-dark-textSecondary"
              />
            ) : (
              <PanelRightClose
                size={24}
                className="text-gray-700 dark:text-dark-textSecondary"
              />
            )}
          </button>{" "}
          {!isCollapsed && (
            <div className="flex flex-col items-end justify-center transition-all">
              <h2 className="font-semibold text-gray-900 dark:text-dark-textPrimary">
                AI Writing Assistant
              </h2>
              <p className="text-xs text-center mt-1">
                <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                  ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                  enter
                </kbd>{" "}
                to continue writing
              </p>
            </div>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col w-full h-full overflow-y-auto py-2 gap-4 transition-all">
          <div className="flex flex-col bg-white dark:bg-dark-paper rounded-xl border border-gray-200 dark:border-dark-divider mx-4 shadow-sm transition-colors duration-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-400/20">
            <textarea
              className="w-full p-4 bg-transparent resize-none focus:outline-none dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-dark-textDisabled"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(
                  textarea.scrollHeight,
                  200
                )}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ask anything"
              rows={3}
              disabled={isChatLoading}
            />
            <div className="flex w-full justify-between items-center px-2 py-1 border-t border-gray-200 dark:border-dark-divider">
              <div className="flex items-center">
                <select
                  value={actionMode}
                  onChange={(e) =>
                    setActionMode(e.target.value as "ask" | "edit")
                  }
                  className="text-xs bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-full px-1 py-1 text-gray-700 dark:text-dark-textSecondary focus:outline-none"
                  disabled={isChatLoading}
                >
                  <option value="edit">Edit</option>
                  <option value="ask">Ask</option>
                </select>
              </div>

              <div className="flex items-center">
                {selected && (
                  <p className="text-xs text-gray-400 italic px-4 pb-1">
                    Using selected text from{" "}
                    <span className="font-medium text-gray-500">
                      {selected.trim().split(/\s+/)[0]}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-gray-500">
                      {selected.trim().split(/\s+/).slice(-1)[0]}
                    </span>
                  </p>
                )}
                {selected && (
                  <button
                    className={`rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2 ml-2 ${
                      isImproving ? "animate-spin" : ""
                    }`}
                    onClick={handleImprove}
                    title="Improve selected text"
                    disabled={isImproving || isChatLoading}
                  >
                    <Sparkles size={20} />
                  </button>
                )}
                {lastRequest && (
                  <button
                    className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2 ml-2"
                    onClick={handleRetry}
                    title="Retry last request"
                    disabled={isChatLoading}
                  >
                    <RefreshCw size={20} />
                  </button>
                )}

                <button
                  className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2"
                  onClick={handleSubmit}
                  disabled={isChatLoading}
                >
                  <CircleArrowUp size={20} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-between p-2 border-y dark:border-dark-divider">
            <div className="flex items-center gap-1">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-dark-paper hover:bg-gray-100 dark:hover:bg-dark-hover transition-all duration-200 focus:outline-none aspect-square"
                title="Clear messages"
                onClick={() => {
                  const button = document.activeElement as HTMLButtonElement;
                  button.classList.add("animate-spin");
                  setTimeout(
                    () => button.classList.remove("animate-spin"),
                    500
                  );
                  setMessages([]);
                  setHistory([]);
                  setLastRequest(null);
                }}
                disabled={isChatLoading}
              >
                <RefreshCw
                  size={18}
                  className="text-gray-800 dark:text-dark-textPrimary"
                />
              </button>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-dark-paper hover:bg-gray-100 dark:hover:bg-dark-hover transition-all duration-200 focus:outline-none aspect-square"
                title="Edit AI Context"
                onClick={() => setIsContextModalOpen(true)}
                id="write-panel-context-button"
              >
                <UserPen
                  size={18}
                  className="text-gray-800 dark:text-dark-textPrimary"
                />
              </button>
              <div className="relative group">
                <div className="absolute top-full left-0 mt-2 px-3 py-1.5 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 transform translate-y-1 group-hover:translate-y-0 w-48">
                  Chat messages are temporary and won't be saved. Instead,
                  document context is maintained and used to help the AI produce
                  better outputs.
                </div>
                <button className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-hover transition-all duration-200 cursor-help">
                  <Info
                    size={14}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
              </div>
            </div>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelType)}
              className="text-xs bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-full px-1 py-1 text-gray-700 dark:text-dark-textSecondary focus:outline-none"
              disabled={isChatLoading}
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div
            ref={scrollContainerRef}
            className="flex flex-col w-full h-[600px] max-h-[600px] px-2 py-1 gap-1 overflow-y-auto dark:border-dark-divider"
          >
            <AnimatePresence>
              {messages.map((msg, index) => (
                <Message
                  key={index}
                  message={msg.message}
                  role={msg.role}
                  contextUpdated={msg.contextUpdated}
                  contextChange={msg.contextChange}
                />
              ))}
              {isChatLoading && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
      <ContextModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        documentId={documentId}
      />

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
            <div className="p-6 max-h-[calc(80vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="flex flex-col">
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-3 flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Before
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap border overflow-y-auto flex-1 max-h-[calc(80vh-260px)]">
                    {contextDiffModal.before || "No previous context"}
                  </div>
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium text-gray-900 dark:text-dark-textPrimary mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    After
                  </h3>
                  <div className="bg-gray-50 dark:bg-dark-secondary rounded-lg p-4 text-sm text-gray-700 dark:text-dark-textSecondary whitespace-pre-wrap border overflow-y-auto flex-1 max-h-[calc(80vh-260px)]">
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
                    const response = await fetch("/api/context", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        documentId,
                        context: contextDiffModal.before,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error("Failed to revert context");
                    }

                    setContextDiffModal({
                      isOpen: false,
                      before: "",
                      after: "",
                    });
                  } catch (error) {
                    console.error("Failed to revert context", error);
                    addToast(
                      "Failed to revert context. Please try again.",
                      "error"
                    );
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
    </aside>
  );
}
