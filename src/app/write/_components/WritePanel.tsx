import { PanelRightClose, RefreshCw, SendHorizonal } from "lucide-react";
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
            ? "bg-blue-50 dark:bg-blue-900 text-right"
            : "bg-gray-50 dark:bg-gray-800 text-left"
        }`}
      >
        <p className="text-gray-900 dark:text-gray-200 text-xs">{message}</p>
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

  const handleSubmit = async () => {
    if (!instructions.trim()) return;

    try {
      const userMessage = { message: instructions, role: "user" as const };
      setMessages((prev) => [...prev, userMessage]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentText: `${inputText}`,
          instructions: `${instructions}`,
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
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <aside className="w-1/3 h-[92.25vh] border-l-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col transition-all duration-200">
      <div className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex w-full items-center justify-between">
          <button className="rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 p-2">
            <PanelRightClose />
          </button>{" "}
          <div className="flex flex-col items-end justify-center">
            <h2 className="font-semibold text-gray-900 dark:text-gray-200">
              AI Writing Assistant
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
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
        </div>
      </div>
      <div className="flex flex-col w-full h-full overflow-y-auto py-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 mx-4">
          <textarea
            className="flex w-full p-4 h-auto resize-none placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:outline-none bg-transparent dark:text-gray-200"
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
          <div className="flex w-full justify-end items-center px-4 py-1">
            <button
              className="rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 p-2"
              onClick={handleSubmit}
            >
              <SendHorizonal size={20} />
            </button>
          </div>
        </div>
        <div className="flex flex-col w-full max-h-[600px] overflow-auto px-2 py-1 gap-1 border-t dark:border-gray-700">
          <div className="flex w-full items-center justify-between">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none aspect-square"
              aria-label="Clear messages"
              onClick={() => {
                const button = document.activeElement as HTMLButtonElement;
                button.classList.add("animate-spin");
                setTimeout(() => button.classList.remove("animate-spin"), 500);
                setMessages([]);
              }}
            >
              <RefreshCw
                size={18}
                className="text-gray-800 dark:text-gray-200"
              />
            </button>
            <p className="text-xs italic text-gray-500 dark:text-gray-400 text-center">
              This is a temporary chat, your work will not be saved.
            </p>
          </div>
          {messages.map((msg, index) => (
            <Message key={index} message={msg.message} role={msg.role} />
          ))}
        </div>
      </div>
    </aside>
  );
}
