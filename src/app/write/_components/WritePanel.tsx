import {
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  SendHorizonal,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ChangeMap } from "./WriteEditor";
import { motion } from "framer-motion";

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
}: {
  inputText: string;
  setChanges: (changes: ChangeMap) => void;
}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [history, setHistory] = useState<
    { role: "user" | "model"; parts: string }[]
  >([]);

  const handleSubmit = async () => {
    if (!instructions.trim()) return;

    const userMessage = { message: instructions, role: "user" as const };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentText: `${inputText}`,
          instructions: `${instructions}`,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();

      const assistantMessage = {
        message: data.result[0],
        role: "assistant" as const,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setChanges(data.result[1]);
      setInstructions("");
      setHistory(data.history);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <aside
      className={`${
        isCollapsed ? "w-14" : "w-1/3"
      } h-[92.25vh] border-l-2 border-gray-300 dark:border-dark-divider bg-white dark:bg-dark-background flex flex-col transition-all duration-200`}
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
            <div className="flex flex-col items-end justify-center">
              <h2 className="font-semibold text-gray-900 dark:text-dark-textPrimary">
                AI Writing Assistant
              </h2>
              <p className="text-xs text-gray-500 dark:text-dark-textSecondary text-center mt-1">
                <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-gray-800">
                  ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50 dark:bg-gray-800">
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
          <div className="bg-white dark:bg-dark-paper rounded-xl border-2 border-gray-200 dark:border-dark-divider mx-4">
            <textarea
              className="flex w-full p-4 h-auto resize-none placeholder-gray-500 dark:placeholder-dark-textDisabled rounded-xl focus:outline-none bg-transparent dark:text-dark-textPrimary"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(
                  textarea.scrollHeight,
                  300
                )}px`;
              }}
              placeholder="Ask anything"
            />
            <div className="flex w-full justify-end items-center px-2 py-1">
              <button
                className="rounded-full hover:bg-gray-300 dark:hover:bg-dark-hover text-purple-600 dark:text-purple-400 transition-colors duration-200 p-2"
                onClick={handleSubmit}
              >
                <SendHorizonal size={20} />
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
                }}
              >
                <RefreshCw
                  size={18}
                  className="text-gray-800 dark:text-dark-textPrimary"
                />
              </button>
              <p className="text-xs italic text-gray-500 dark:text-dark-textSecondary text-center">
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
