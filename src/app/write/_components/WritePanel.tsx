import { PanelRightClose, RefreshCw, SendHorizonal } from "lucide-react";
import { useState, useEffect } from "react";
import { ChangeMap } from "./WriteEditor";

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
      <div
        className={`max-w-[85%] p-3 rounded-xl my-2 ${
          role === "user" ? "bg-blue-50 text-right" : "bg-gray-50 text-left"
        }`}
      >
        <p className="text-gray-900 text-xs">{message}</p>
      </div>
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
    <aside className="w-1/3 h-[92.25vh] border-l-2 border-gray-300 bg-white flex flex-col">
      <div className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <div className="flex w-full items-center justify-between">
          <button className="rounded-full hover:bg-gray-300 transition-colors duration-200 p-2">
            <PanelRightClose />
          </button>{" "}
          <div className="flex flex-col items-end justify-center">
            <h2 className="font-semibold text-gray-900">
              AI Writing Assistant
            </h2>
            <p className="text-xs text-gray-500 text-center mt-1">
              <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50">
                ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="px-1 py-0.5 text-xs rounded border bg-gray-50">
                enter
              </kbd>{" "}
              to continue writing
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-full h-full overflow-y-auto py-2 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 mx-4">
          <textarea
            className="flex w-full p-4 h-auto resize-none placeholder-gray-500 rounded-xl focus:outline-none"
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
              className="rounded-full hover:bg-gray-300 transition-colors duration-200 p-2"
              onClick={handleSubmit}
            >
              <SendHorizonal size={20} />
            </button>
          </div>
        </div>
        <div className="flex flex-col w-full max-h-[600px] overflow-auto px-2 py-1 gap-1 border-t">
          <div className="flex w-full items-center justify-between">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-gray-100 transition-all duration-200 focus:outline-none aspect-square"
              aria-label="Clear messages"
              onClick={() => {
                const button = document.activeElement as HTMLButtonElement;
                button.classList.add("animate-spin");
                setTimeout(() => button.classList.remove("animate-spin"), 500);
                setMessages([]);
              }}
            >
              <RefreshCw size={18} className="text-gray-800" />
            </button>
            <p className="text-xs italic text-gray-500 text-center">
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
