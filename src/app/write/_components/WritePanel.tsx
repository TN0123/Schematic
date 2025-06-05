import {
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  CircleArrowUp,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ChangeMap } from "./WriteEditor";
import { motion, AnimatePresence } from "framer-motion";

export type ModelType = "basic" | "premium";

interface MessageProps {
  message: string;
  role: "user" | "assistant";
}

export function Message({ message, role }: MessageProps) {
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
  premiumRemainingUses,
  setPremiumRemainingUses,
  onModelChange,
}: {
  inputText: string;
  setChanges: (changes: ChangeMap) => void;
  selected: string;
  lastRequest: {
    input: string;
    selected: string;
    instructions: string;
    history: { role: "user" | "model"; parts: string }[];
  } | null;
  setLastRequest: (
    request: {
      input: string;
      selected: string;
      instructions: string;
      history: { role: "user" | "model"; parts: string }[];
    } | null
  ) => void;
  userId: string | undefined;
  premiumRemainingUses: number | null;
  setPremiumRemainingUses: (remainingUses: number) => void;
  onModelChange: (model: ModelType) => void;
}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [history, setHistory] = useState<
    { role: "user" | "model"; parts: string }[]
  >([]);
  const [isImproving, setIsImproving] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>("premium");

  useEffect(() => {
    onModelChange(selectedModel);
  }, [selectedModel, onModelChange]);

  const handleSubmit = async () => {
    if (!instructions.trim()) return;

    const requestPayload = {
      input: inputText,
      selected,
      instructions,
      history,
    };

    const userMessage = { message: instructions, role: "user" as const };
    setMessages((prev) => [...prev, userMessage]);

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
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();
      if (data.remainingUses !== null) {
        setPremiumRemainingUses(data.remainingUses);
      }
      const assistantMessage = {
        message: data.result[0],
        role: "assistant" as const,
      };
      setLastRequest(requestPayload);
      setMessages((prev) => [...prev, assistantMessage]);
      setChanges(data.result[1]);
      setInstructions("");
      setHistory(data.history);
    } catch (error) {
      console.error(error);
    }
  };

  const handleImprove = async () => {
    setIsImproving(true); // Start loading animation
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
        throw new Error("Failed to generate content");
      }

      const data = await response.json();
      if (data.remainingUses !== null) {
        setPremiumRemainingUses(data.remainingUses);
      }
      setChanges(data.result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsImproving(false); // Stop loading animation
    }
  };

  const handleRetry = async () => {
    if (!lastRequest) return;

    const { input, selected, instructions, history } = lastRequest;

    setMessages((prev) => {
      const trimmed = [...prev];
      if (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") {
        trimmed.pop();
      }
      return trimmed;
    });

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
        }),
      });

      if (!response.ok) {
        throw new Error("Retry failed");
      }

      const data = await response.json();

      const assistantMessage = {
        message: data.result[0],
        role: "assistant" as const,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setChanges(data.result[1]);
      setHistory(data.history);
    } catch (error) {
      console.error(error);
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
              <AnimatePresence mode="wait">
                {selected ? (
                  <motion.p
                    key="selected"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-purple-600 dark:text-purple-400 text-center mt-1"
                  >
                    <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                      ctrl
                    </kbd>{" "}
                    +{" "}
                    <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                      i
                    </kbd>{" "}
                    to improve selected text
                  </motion.p>
                ) : (
                  <motion.p
                    key="default"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-center mt-1"
                  >
                    <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                      ctrl
                    </kbd>{" "}
                    +{" "}
                    <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-dark-secondary">
                      enter
                    </kbd>{" "}
                    to continue writing
                  </motion.p>
                )}
              </AnimatePresence>
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
              placeholder="Ask anything"
              rows={3}
            />
            <div className="flex w-full justify-end items-center px-2 py-1 border-t border-gray-200 dark:border-dark-divider">
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
                  aria-label="Improve selected text"
                  disabled={isImproving} // Disable button while loading
                >
                  <Sparkles size={20} />
                </button>
              )}
              {lastRequest && (
                <button
                  className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2 ml-2"
                  onClick={handleRetry}
                  title="Retry last request"
                >
                  <RefreshCw size={20} />
                </button>
              )}

              <button
                className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2"
                onClick={handleSubmit}
              >
                <CircleArrowUp size={20} />
              </button>
            </div>
          </div>
          <div className="flex flex-col w-full max-h-[600px] overflow-auto px-2 py-1 gap-1 border-t dark:border-dark-divider">
            <div className="flex w-full items-center justify-between">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-dark-paper hover:bg-gray-100 dark:hover:bg-dark-hover transition-all duration-200 focus:outline-none aspect-square"
                aria-label="Clear messages"
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
              >
                <RefreshCw
                  size={18}
                  className="text-gray-800 dark:text-dark-textPrimary"
                />
              </button>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelType)}
                className="text-xs bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-full px-1 py-1 text-gray-700 dark:text-dark-textSecondary focus:outline-none"
              >
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
              <p className="text-[10px] italic text-gray-500 dark:text-dark-textSecondary text-center">
                This is a temporary chat, your work will not be saved.
              </p>
            </div>
            {messages.map((msg, index) => (
              <Message key={index} message={msg.message} role={msg.role} />
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
