import {
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  CircleArrowUp,
  CircleStop,
  UserPen,
  Info,
  AlertCircle,
  X,
  ArrowLeft,
  FileText,
  FileUp,
  Settings,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChangeMap, ModelType } from "./utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  useModifierKeyLabel,
  isPrimaryModifierPressed,
} from "@/components/utils/platform";
import ContextModal from "./ContextModal";
import { ChangeHandler } from "./ChangeHandler";
import Link from "next/link";
import { TransitionLink } from "@/components/utils/TransitionLink";

interface MessageProps {
  message: string;
  role: "user" | "assistant";
  contextUpdated?: boolean;
  contextChange?: {
    before: string;
    after: string;
  };
  isStreaming?: boolean;
  isTyping?: boolean;
  id?: string;
}

interface ErrorState {
  message: string;
  type: "network" | "server" | "auth" | "validation" | "unknown";
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
  isStreaming,
  isTyping,
  isGeneratingChanges,
  isCurrentAssistantMessage,
}: MessageProps & {
  onShowContextDiff?: (before: string, after: string) => void;
  isGeneratingChanges?: boolean;
  isCurrentAssistantMessage?: boolean;
}) {
  // If typing has started but no content yet, show typing indicator
  if (isTyping && !message) {
    return <TypingIndicator />;
  }

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
        } ${
          isGeneratingChanges &&
          role === "assistant" &&
          isCurrentAssistantMessage &&
          message.trim()
            ? "border-2 border-purple-200 dark:border-purple-600"
            : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <p className="text-gray-900 dark:text-dark-textPrimary text-xs flex-1">
            {message}
          </p>
          {isGeneratingChanges &&
            role === "assistant" &&
            isCurrentAssistantMessage &&
            message.trim() && (
              <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-1"
                >
                  <RefreshCw size={12} />
                </motion.div>
                <span>Editing...</span>
              </div>
            )}
        </div>
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
  onChatLoadingChange,
  variant = "desktop",
  // ChangeHandler props for mobile variant
  changes,
  applyChange,
  rejectChange,
  appendChange,
  acceptAllChanges,
  rejectAllChanges,
  setActiveHighlight,
  // Document props
  title,
  onTitleChange,
  onExport,
  isAutocompleteEnabled,
  onAutocompleteToggle,
  isMobile,
  isSaving,
  isSavingContent,
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
  onChatLoadingChange?: (loading: boolean) => void;
  variant?: "desktop" | "mobile";
  // ChangeHandler props for mobile variant
  changes?: ChangeMap;
  applyChange?: (original: string, replacement: string) => void;
  rejectChange?: (original: string) => void;
  appendChange?: (newText: string) => void;
  acceptAllChanges?: () => void;
  rejectAllChanges?: () => void;
  setActiveHighlight?: (text: string | null) => void;
  // Document props
  title?: string;
  onTitleChange?: (title: string) => void;
  onExport?: () => void;
  isAutocompleteEnabled?: boolean;
  onAutocompleteToggle?: () => void;
  isMobile?: boolean;
  isSaving?: boolean;
  isSavingContent?: boolean;
}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const modKeyLabel = useModifierKeyLabel();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [history, setHistory] = useState<
    { role: "user" | "model"; parts: string }[]
  >([]);
  const [isImproving, setIsImproving] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isGeneratingChanges, setIsGeneratingChanges] = useState(false);
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<
    string | null
  >(null);
  const messageIdCounter = useRef(0);

  // Generate unique message IDs
  const generateMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  }, []);

  // Notify parent component of loading state changes
  useEffect(() => {
    onChatLoadingChange?.(isChatLoading);
  }, [isChatLoading, onChatLoadingChange]);
  const [selectedModel, setSelectedModel] = useState<ModelType>("gpt-4.1");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasPremiumDisabledRef = useRef(false);
  const [contextDiffModal, setContextDiffModal] = useState<{
    isOpen: boolean;
    before: string;
    after: string;
  }>({ isOpen: false, before: "", after: "" });
  const [actionMode, setActionMode] = useState<"ask" | "edit">("edit");
  const chatAbortControllerRef = useRef<AbortController | null>(null);

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

  // Auto-switch to basic model when premium uses run out
  useEffect(() => {
    if (premiumRemainingUses === 0 && selectedModel !== "basic") {
      setSelectedModel("basic");
      wasPremiumDisabledRef.current = true;
    }
  }, [premiumRemainingUses, selectedModel]);

  // Notify when premium uses become available again
  useEffect(() => {
    if (
      premiumRemainingUses !== null &&
      premiumRemainingUses > 0 &&
      wasPremiumDisabledRef.current
    ) {
      wasPremiumDisabledRef.current = false;
    }
  }, [premiumRemainingUses]);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM has updated and scroll at the right time
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        } else if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      }, 150); // Slightly increased timeout for smoother animation timing
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

  // Function to handle streaming responses with new dual-stream architecture
  const handleStreamingResponse = async (requestPayload: any) => {
    return new Promise<void>(async (resolve, reject) => {
      let assistantMessageId: string | null = null;
      let currentAssistantText = "";

      // Add a typing indicator for the message
      const msgId = generateMessageId();
      const typingMessageObj = {
        message: "",
        role: "assistant" as const,
        isTyping: true,
        id: msgId,
      };
      assistantMessageId = msgId;
      setCurrentAssistantMessageId(msgId);
      setMessages((prev) => [...prev, typingMessageObj]);

      // Hide ChangeHandler while generating by clearing any previous changes
      if (actionMode === "edit") {
        setChanges({});
        setIsGeneratingChanges(true);
      }

      try {
        const controller = new AbortController();
        chatAbortControllerRef.current = controller;

        // Make the POST request to the chat endpoint
        const response = await fetch("/api/write/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentText: selected || inputText,
            instructions: requestPayload.instructions,
            history,
            userId,
            documentId,
            model: selectedModel,
            actionMode,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages in the buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim() === "") continue;

            if (line.startsWith("event:")) {
              // Event type line, skip
              continue;
            }

            if (line.startsWith("data:")) {
              try {
                const jsonData = line.substring(5).trim();
                const data = JSON.parse(jsonData);

                // Handle new event types from dual-stream architecture
                if (data.delta !== undefined) {
                  // assistant-delta event: streaming text from the assistant
                  currentAssistantText += data.delta;

                  // Update the chat message with streaming content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            message: currentAssistantText,
                            isTyping: true,
                          }
                        : msg
                    )
                  );
                } else if (data.text !== undefined) {
                  // assistant-complete event: final text received, keep typing indicator for edit mode
                  currentAssistantText = data.text;

                  // Don't stop typing indicator here - wait for changes to be ready
                } else if (data.changes !== undefined) {
                  // changes-final event: change map is ready

                  if (actionMode === "edit") {
                    setChanges(data.changes);
                    setIsGeneratingChanges(false);
                    setCurrentAssistantMessageId(null);
                  }
                } else if (data.result !== undefined) {
                  // result event: final consolidated result - NOW we can stop the typing indicator

                  if (
                    data.remainingUses !== null &&
                    data.remainingUses !== undefined
                  ) {
                    setPremiumRemainingUses(data.remainingUses);
                  }

                  let finalMessage: string;
                  let finalChanges: any = {};

                  if (actionMode === "ask") {
                    finalMessage = data.result;
                  } else {
                    // For edit mode, use the streamed assistant text and parsed changes
                    finalMessage = data.result[0] || currentAssistantText;
                    finalChanges = data.result[1] || {};
                  }

                  // Update the final message (no longer typing)
                  const finalMessageObj = {
                    message: finalMessage,
                    role: "assistant" as const,
                    contextUpdated: data.contextUpdated,
                    contextChange: data.contextChange,
                    id: assistantMessageId,
                    isTyping: false,
                  };

                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId ? finalMessageObj : msg
                    )
                  );

                  setLastRequest(requestPayload);

                  // Apply the final changes for edit mode (if not already applied)
                  if (
                    actionMode === "edit" &&
                    Object.keys(finalChanges).length > 0
                  ) {
                    setChanges(finalChanges);
                    setIsGeneratingChanges(false);
                    setCurrentAssistantMessageId(null);
                  }

                  setHistory(data.history);
                } else if (data.message && data.message.includes("complete")) {
                  // complete event: stream is done
                  resolve();
                  return;
                } else if (data.error) {
                  // error event
                  reject(new Error(data.message));
                  return;
                }
              } catch (parseError) {}
            }
          }
        }

        resolve();
      } catch (error: any) {
        if (error?.name === "AbortError") {
          // Swallow aborts as a user cancellation
          resolve();
        } else {
          reject(error);
        }
      } finally {
        chatAbortControllerRef.current = null;
        setIsGeneratingChanges(false);
        setCurrentAssistantMessageId(null);
      }
    });
  };

  const cancelChatRequest = () => {
    try {
      chatAbortControllerRef.current?.abort();
    } catch {}
    // Remove any typing indicator message
    setMessages((prev) => prev.filter((m) => !m.isTyping));
    setIsChatLoading(false);
    setIsGeneratingChanges(false);
    setCurrentAssistantMessageId(null);
  };

  const handleSubmit = async () => {
    if (!instructions.trim()) return;

    const requestPayload = {
      input: inputText,
      selected,
      instructions,
      history,
      actionMode,
    };

    const userMessage = {
      message: instructions,
      role: "user" as const,
      id: generateMessageId(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInstructions("");
    setIsChatLoading(true);

    try {
      // Use streaming endpoint (now unified in main chat route)
      await handleStreamingResponse(requestPayload);
    } catch (error) {
      const errorState = handleNetworkError(error as Error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!selected) return;
    onImproveStart();
    setIsImproving(true);
    // Hide ChangeHandler while generating by clearing any previous changes
    setChanges({});
    setIsGeneratingChanges(true);
    // For improve, we don't have a specific message ID, so we'll use a special identifier
    setCurrentAssistantMessageId("improve");

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

      const response = await fetch("/api/write/chat/improve", {
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
        return;
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages in the buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("event:")) {
            continue;
          }

          if (line.startsWith("data:")) {
            try {
              const jsonData = line.substring(5).trim();
              const data = JSON.parse(jsonData);

              // Handle different event types
              if (data.delta !== undefined) {
                // assistant-delta event: We could show live preview here if desired
                // For now, just continue
              } else if (data.changes !== undefined) {
                // changes-final event: apply the changes
                setChanges(data.changes);
                setIsGeneratingChanges(false);
                setCurrentAssistantMessageId(null);
              } else if (data.result !== undefined) {
                // result event: final result
                if (
                  data.remainingUses !== null &&
                  data.remainingUses !== undefined
                ) {
                  setPremiumRemainingUses(data.remainingUses);
                }
                // Apply final changes if not already applied
                if (Object.keys(data.result).length > 0) {
                  setChanges(data.result);
                  setIsGeneratingChanges(false);
                  setCurrentAssistantMessageId(null);
                }
              } else if (data.message && data.message.includes("complete")) {
                // complete event
                break;
              } else if (data.error) {
                // error event
                throw new Error(data.message);
              }
            } catch (parseError) {}
          }
        }
      }
    } catch (error) {
      const errorState = handleNetworkError(error as Error);
    } finally {
      setIsImproving(false);
      setIsGeneratingChanges(false);
      setCurrentAssistantMessageId(null);
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
    // Hide ChangeHandler while generating by clearing any previous changes
    setChanges({});
    if (retryActionMode === "edit") {
      setIsGeneratingChanges(true);
      // Create a new message ID for retry
      const retryMessageId = generateMessageId();
      setCurrentAssistantMessageId(retryMessageId);
    }

    try {
      const controller = new AbortController();
      chatAbortControllerRef.current = controller;
      const response = await fetch("/api/write/chat", {
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
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorState = await parseApiError(response);
        return;
      }

      const data = await response.json();

      const assistantMessageId = generateMessageId();
      const assistantMessage = {
        message: retryActionMode === "ask" ? data.result : data.result[0],
        role: "assistant" as const,
        contextUpdated: data.contextUpdated,
        contextChange: data.contextChange,
        id: assistantMessageId,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Only apply changes for "edit" mode
      if (retryActionMode === "edit") {
        setChanges(data.result[1]);
        setIsGeneratingChanges(false);
        setCurrentAssistantMessageId(null);
      }

      setHistory(data.history);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        // cancelled by user
      } else {
        const errorState = handleNetworkError(error as Error);
      }
    } finally {
      setIsChatLoading(false);
      setIsGeneratingChanges(false);
      setCurrentAssistantMessageId(null);
      chatAbortControllerRef.current = null;
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (isPrimaryModifierPressed(event) && event.key.toLowerCase() === "i") {
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

  const wrapperClass =
    variant === "mobile"
      ? "w-full h-full bg-white dark:bg-dark-background flex flex-col"
      : `${
          isCollapsed ? "lg:w-14" : "w-full lg:w-1/3"
        } hidden lg:flex lg:h-full h-[50vh] lg:border-l-2 border-t-2 lg:border-t-0 border-gray-300 dark:border-dark-divider bg-white dark:bg-dark-background flex-col transition-all duration-200`;

  const innerScrollClass =
    variant === "mobile"
      ? "flex flex-col w-full h-full overflow-y-auto py-2 gap-4 transition-all"
      : "flex flex-col w-full lg:h-full h-[calc(50vh-64px)] overflow-y-auto py-2 gap-4 transition-all";

  const messagesContainerClass =
    variant === "mobile"
      ? "flex flex-col w-full flex-1 px-2 py-1 gap-1 overflow-y-auto dark:border-dark-divider"
      : "flex flex-col w-full h-[38vh] max-h-[38vh] lg:h-[600px] lg:max-h-[600px] px-2 py-1 gap-1 overflow-y-auto dark:border-dark-divider";

  return (
    <aside
      className={wrapperClass}
      id={variant === "mobile" ? "write-panel-mobile" : "write-panel"}
    >
      <div className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-dark-divider transition-all">
        <div className="flex w-full items-center justify-between gap-2 lg:gap-3">
          {!isCollapsed && variant === "desktop" && (
            <>
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <Link
                  href="/write"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50 shadow-sm hover:shadow-md hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-800/30 dark:hover:to-indigo-800/30 text-sm font-medium text-purple-700 dark:text-purple-200 transition-all duration-200 backdrop-blur-sm flex-shrink-0"
                  title="Back to Documents"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="h-6 w-px bg-gray-200 dark:bg-dark-divider hidden lg:block"></div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-5 h-5 dark:text-dark-textSecondary flex-shrink-0" />
                  <input
                    type="text"
                    value={title || ""}
                    onChange={(e) => onTitleChange?.(e.target.value)}
                    className="text-lg w-full font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-dark-textPrimary text-ellipsis overflow-hidden min-w-0"
                    placeholder="Untitled Document"
                  />
                  {(isSaving || isSavingContent) && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="relative group">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 p-2 mx-2 rounded-lg bg-gray-100 dark:bg-dark-secondary shadow-sm hover:shadow-md hover:bg-gray-200 dark:hover:bg-dark-hover text-sm font-medium text-gray-600 dark:text-dark-textSecondary transition-all duration-200 backdrop-blur-sm flex-shrink-0"
                    id="write-settings-button"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-gray-900/80 dark:bg-dark-secondary dark:text-dark-textPrimary dark:border-dark-divider shadow-lg">
                    Settings
                  </div>
                </div>

                {/* Export button - icon only with tooltip */}
                <div className="relative group">
                  <button
                    onClick={() => onExport?.()}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-dark-secondary text-gray-600 dark:text-dark-textSecondary hover:bg-gray-200 dark:hover:bg-dark-hover transition-all duration-200"
                    aria-label="Export to PDF"
                  >
                    <FileUp className="w-4 h-4" />
                  </button>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-gray-900/80 dark:bg-dark-secondary dark:text-dark-textPrimary dark:border-dark-divider shadow-lg">
                    Export to PDF
                  </div>
                </div>
              </div>
            </>
          )}
          {variant === "desktop" && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover transition-colors duration-200 ${
                isCollapsed ? "" : "p-2"
              }`}
              title={isCollapsed ? "Expand panel" : "Collapse panel"}
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
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className={innerScrollClass}>
          <div className="flex flex-col bg-white dark:bg-dark-paper rounded-xl border border-gray-200 dark:border-dark-divider mx-4 shadow-sm transition-colors duration-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-400/20">
            <textarea
              className={`w-full p-4 bg-transparent resize-none focus:outline-none dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-dark-textDisabled ${
                isChatLoading ? "cursor-not-allowed" : ""
              }`}
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
                {isChatLoading ? (
                  <button
                    className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2"
                    onClick={cancelChatRequest}
                    title="Stop generating"
                  >
                    <CircleStop size={20} />
                  </button>
                ) : (
                  <button
                    className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2"
                    onClick={handleSubmit}
                  >
                    <CircleArrowUp size={20} />
                  </button>
                )}
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
                <div className="absolute top-full left-0 mt-2 px-3 py-1.5 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 transform translate-y-1 group-hover:translate-y-0 w-48 pointer-events-none">
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
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => {
                  const newModel = e.target.value as ModelType;
                  if (newModel !== "basic" && premiumRemainingUses === 0) {
                    return;
                  }
                  setSelectedModel(newModel);
                }}
                className="text-xs bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-full px-1 py-1 text-gray-700 dark:text-dark-textSecondary focus:outline-none"
                disabled={isChatLoading}
              >
                <option value="basic">Gemini 2.5 Flash</option>
                <option
                  value="gpt-4.1"
                  disabled={premiumRemainingUses === 0}
                  className={
                    premiumRemainingUses === 0
                      ? "text-gray-400 dark:text-gray-500"
                      : ""
                  }
                >
                  GPT-4.1 (Premium)
                </option>
                <option
                  value="claude-sonnet-4"
                  disabled={premiumRemainingUses === 0}
                  className={
                    premiumRemainingUses === 0
                      ? "text-gray-400 dark:text-gray-500"
                      : ""
                  }
                >
                  Claude Sonnet 4 (Premium)
                </option>
              </select>
              <div className="relative group">
                <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 transform translate-y-1 group-hover:translate-y-0 w-48 pointer-events-none">
                  {premiumRemainingUses === null
                    ? "Loading premium usage..."
                    : premiumRemainingUses === 0
                    ? "Premium model uses exhausted. Switch to basic model or wait for usage to reset."
                    : `Premium model uses remaining: ${premiumRemainingUses}. Premium model provides higher quality AI responses.`}
                </div>
                <button className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-hover transition-all duration-200 cursor-help">
                  <Info
                    size={14}
                    className="text-gray-600 dark:text-gray-400"
                  />
                </button>
              </div>
            </div>
          </div>
          <div ref={scrollContainerRef} className={messagesContainerClass}>
            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => (
                <Message
                  key={msg.id || index}
                  message={msg.message}
                  role={msg.role}
                  contextUpdated={msg.contextUpdated}
                  contextChange={msg.contextChange}
                  isStreaming={msg.isStreaming}
                  isTyping={msg.isTyping}
                  isGeneratingChanges={isGeneratingChanges}
                  isCurrentAssistantMessage={
                    msg.id === currentAssistantMessageId ||
                    (currentAssistantMessageId === "improve" &&
                      msg.role === "assistant" &&
                      messages.indexOf(msg) === messages.length - 1)
                  }
                />
              ))}
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
                    const response = await fetch("/api/write/context", {
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
                  } catch (error) {}
                }}
                className="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 transition"
              >
                Reject Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ChangeHandler for mobile variant */}
      {variant === "mobile" &&
        changes &&
        Object.keys(changes).length > 0 &&
        applyChange &&
        rejectChange &&
        appendChange &&
        acceptAllChanges &&
        rejectAllChanges &&
        setActiveHighlight && (
          <div className="border-t border-gray-200 dark:border-dark-divider p-2">
            <ChangeHandler
              changes={changes}
              applyChange={applyChange}
              rejectChange={rejectChange}
              appendChange={appendChange}
              acceptAllChanges={acceptAllChanges}
              rejectAllChanges={rejectAllChanges}
              setActiveHighlight={setActiveHighlight}
              isStreaming={false}
            />
          </div>
        )}
    </aside>
  );
}
