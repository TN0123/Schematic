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
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { ChangeMap } from "./WriteEditor";
import { motion, AnimatePresence } from "framer-motion";
import {
  useModifierKeyLabel,
  isPrimaryModifierPressed,
} from "@/components/utils/platform";
import ContextModal from "./ContextModal";
import { ChangeHandler } from "./ChangeHandler";

export type ModelType = "basic" | "gpt-4.1" | "claude-sonnet-4";

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
  isStreaming,
  isTyping,
}: MessageProps & {
  onShowContextDiff?: (before: string, after: string) => void;
}) {
  // If it's a typing indicator, render the TypingIndicator component
  if (isTyping) {
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
          isStreaming ? "border-2 border-blue-200 dark:border-blue-600" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          <p className="text-gray-900 dark:text-dark-textPrimary text-xs flex-1">
            {message}
            {isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="inline-block ml-1 w-2 h-4 bg-blue-500 dark:bg-blue-400"
              />
            )}
          </p>
          {isStreaming && (
            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-1"
              >
                <RefreshCw size={12} />
              </motion.div>
              <span>Streaming...</span>
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
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

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

  // Auto-switch to basic model when premium uses run out
  useEffect(() => {
    if (premiumRemainingUses === 0 && selectedModel !== "basic") {
      setSelectedModel("basic");
      wasPremiumDisabledRef.current = true;
      addToast(
        "Premium uses exhausted - automatically switched to basic model",
        "warning"
      );
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
      addToast("Premium model is now available again!", "success");
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

  // Helper function to extract streaming message from partial response
  const extractStreamingMessage = (partialResponse: string): string | null => {
    try {
      // Look for the start of the JSON array and first string
      const arrayStart = partialResponse.indexOf("[");
      if (arrayStart === -1) return null;

      const firstQuote = partialResponse.indexOf('"', arrayStart);
      if (firstQuote === -1) return null;

      // Find the end of the message string, handling escaped quotes
      let messageEnd = firstQuote + 1;
      let escaped = false;

      while (messageEnd < partialResponse.length) {
        const char = partialResponse[messageEnd];
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          // Check if this quote is followed by a comma (end of first element)
          const nextNonSpace = partialResponse
            .slice(messageEnd + 1)
            .match(/^\s*,/);
          if (nextNonSpace) {
            // This is the end of the first element
            const message = partialResponse.slice(firstQuote + 1, messageEnd);
            return message.replace(/\\"/g, '"').replace(/\\n/g, "\n");
          } else {
            // This might be the end of the entire message if it's the last element
            const nextNonSpace2 = partialResponse
              .slice(messageEnd + 1)
              .match(/^\s*\]/);
            if (nextNonSpace2) {
              const message = partialResponse.slice(firstQuote + 1, messageEnd);
              return message.replace(/\\"/g, '"').replace(/\\n/g, "\n");
            }
          }
        }
        messageEnd++;
      }

      // If we haven't found the end, return the partial message so far
      if (messageEnd > firstQuote + 1) {
        const partialMessage = partialResponse.slice(
          firstQuote + 1,
          messageEnd
        );
        return partialMessage.replace(/\\"/g, '"').replace(/\\n/g, "\n");
      }
    } catch (error) {
      // Silent fail for extraction
    }
    return null;
  };

  // Helper function to parse complete response for changes
  const parseCompleteResponse = (response: string): [string, any] | null => {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return [parsed[0], parsed[1]];
      }
    } catch (error) {
      // Continue to fallback parsing strategies
    }

    // Use the same robust parsing from the original function as fallback
    try {
      const messageMatch = response.match(/"([^"]+(?:\\"[^"]*)*)",/);
      const message = messageMatch
        ? messageMatch[1].replace(/\\"/g, '"')
        : "AI response could not be parsed properly.";

      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        let jsonStr = objMatch[0];
        jsonStr = jsonStr
          .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
          .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
            return `: "${content
              .replace(/\n/g, "\\n")
              .replace(/\r/g, "\\r")
              .replace(/\t/g, "\\t")}"`;
          });

        const changes = JSON.parse(jsonStr);
        return [message, changes];
      }
    } catch (error) {
      // Continue to final fallback
    }

    return null;
  };

  // Function to handle streaming responses
  const handleStreamingResponse = async (requestPayload: any) => {
    return new Promise<void>(async (resolve, reject) => {
      let fullStreamingResponse = "";
      let assistantMessageId: string | null = null;
      let currentStreamingMessage = "";

      // Add a typing indicator for the message
      const typingMessageObj = {
        message: "",
        role: "assistant" as const,
        isTyping: true,
        id: Date.now().toString(),
      };
      assistantMessageId = typingMessageObj.id;
      setMessages((prev) => [...prev, typingMessageObj]);

      // Hide ChangeHandler while generating by clearing any previous changes
      if (actionMode === "edit") {
        setChanges({});
      }

      try {
        const controller = new AbortController();
        chatAbortControllerRef.current = controller;
        // Make the POST request to the chat endpoint (now with streaming)
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
              const eventType = line.substring(6).trim();
              continue;
            }

            if (line.startsWith("data:")) {
              try {
                const jsonData = line.substring(5).trim();
                const data = JSON.parse(jsonData);

                // Handle different event types based on the data structure
                if (data.chunk !== undefined) {
                  // Accumulate the full response
                  fullStreamingResponse += data.chunk;

                  // Extract and stream just the message portion
                  const streamedMessage = extractStreamingMessage(
                    fullStreamingResponse
                  );

                  if (
                    streamedMessage &&
                    streamedMessage !== currentStreamingMessage
                  ) {
                    currentStreamingMessage = streamedMessage;

                    // Update the chat message with streaming content
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              message: currentStreamingMessage,
                              isTyping: true,
                            }
                          : msg
                      )
                    );

                    // Keep ChangeHandler hidden during generation; do not set interim states
                  }
                } else if (data.result !== undefined) {
                  // This is the final result - parse the complete response
                  if (data.remainingUses !== null) {
                    setPremiumRemainingUses(data.remainingUses);
                  }

                  let finalMessage: string;
                  let finalChanges: any = {};

                  if (actionMode === "ask") {
                    finalMessage = data.result;
                  } else {
                    // Parse the complete response for changes
                    const parseResult = parseCompleteResponse(
                      fullStreamingResponse
                    );
                    if (parseResult) {
                      [finalMessage, finalChanges] = parseResult;
                    } else {
                      // Fallback: try to use the streamed message and server-provided result
                      finalMessage =
                        currentStreamingMessage ||
                        data.result[0] ||
                        "AI response was generated successfully.";
                      finalChanges = data.result[1] || {};

                      // If we still don't have changes but have a message, create a gentle fallback
                      if (
                        Object.keys(finalChanges).length === 0 &&
                        finalMessage
                      ) {
                        finalChanges = {
                          "!PARSING_ERROR!":
                            "The AI response was generated but couldn't be processed into editable changes. Please try your request again.",
                        };
                      }
                    }
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

                  // Apply the final changes for edit mode
                  if (actionMode === "edit") {
                    setChanges(finalChanges);
                  }

                  setHistory(data.history);
                } else if (data.message && data.message.includes("complete")) {
                  // Stream is complete
                  resolve();
                  return;
                } else if (data.error) {
                  // Error occurred
                  addToast(data.message || "Streaming failed", "error");
                  reject(new Error(data.message));
                  return;
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError);
              }
            }
          }
        }

        resolve();
      } catch (error: any) {
        if (error?.name === "AbortError") {
          // Swallow aborts as a user cancellation
          resolve();
        } else {
          console.error("Error in streaming request:", error);
          addToast("Streaming request failed", "error");
          reject(error);
        }
      } finally {
        chatAbortControllerRef.current = null;
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

    const userMessage = { message: instructions, role: "user" as const };
    setMessages((prev) => [...prev, userMessage]);
    setInstructions("");
    setIsChatLoading(true);

    try {
      // Use streaming endpoint (now unified in main chat route)
      await handleStreamingResponse(requestPayload);
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
    // Hide ChangeHandler while generating by clearing any previous changes
    setChanges({});

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
    // Hide ChangeHandler while generating by clearing any previous changes
    setChanges({});

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
    } catch (error: any) {
      if (error?.name === "AbortError") {
        // cancelled by user
      } else {
        console.error(error);
        const errorState = handleNetworkError(error as Error);
        addToast(errorState.message, "error");
      }
    } finally {
      setIsChatLoading(false);
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
          {variant === "desktop" && (
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
            </button>
          )}
          {!isCollapsed && (
            <div className="flex flex-col items-end justify-center transition-all">
              <h2 className="font-semibold text-gray-900 dark:text-dark-textPrimary">
                AI Writing Assistant
              </h2>
              <p className="text-xs text-center mt-1">
                <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                  {modKeyLabel.toLowerCase()}
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
        <div className={innerScrollClass}>
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
                    addToast(
                      "Premium model unavailable - no uses remaining",
                      "warning"
                    );
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
            <AnimatePresence>
              {messages.map((msg, index) => (
                <Message
                  key={index}
                  message={msg.message}
                  role={msg.role}
                  contextUpdated={msg.contextUpdated}
                  contextChange={msg.contextChange}
                  isStreaming={msg.isStreaming}
                  isTyping={msg.isTyping}
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
              isStreaming={isChatLoading}
            />
          </div>
        )}
    </aside>
  );
}
