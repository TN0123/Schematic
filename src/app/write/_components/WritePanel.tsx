import {
  Plus,
  Type,
  FileUp,
  RefreshCcw,
  PanelRightClose,
  SendHorizonal,
  Sparkles,
  MoreVertical,
} from "lucide-react";
import WriteOptions from "./WriteOptions";
import { useState } from "react";

export default function WritePanel({
  onSelectContext,
  setContinue,
  input,
}: {
  onSelectContext: (context: string) => void;
  setContinue: (enabled: boolean) => void;
  input: string;
}) {
  return (
    <aside className="w-1/3 h-full border-l-2 border-gray-300 bg-white flex flex-col">
      <div className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-200">
        <div className="flex w-full items-center justify-between">
          <button className="rounded-full hover:bg-gray-300 transition-colors duration-200 p-2">
            <PanelRightClose />
          </button>{" "}
          <div className="flex flex-col items-end justify-center">
            <h2 className="font-semibold text-gray-900">
              AI Writing Assistant
            </h2>
            <p className="text-xs text-gray-500 mt-1">
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
      <div className="flex flex-col w-full h-full py-2 gap-4 ">
        <div className="bg-white rounded-xl border-2 border-gray-200 mx-4">
          <textarea
            className="flex w-full p-4 h-auto resize-none placeholder-gray-500 rounded-xl focus:outline-none"
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
            <button className="rounded-full hover:bg-gray-300 transition-colors duration-200 p-2">
              <SendHorizonal size={20} />
            </button>
          </div>
        </div>
        <WriteOptions
          onSelectContext={onSelectContext}
          setContinue={setContinue}
          input={input}
        />
      </div>
    </aside>
  );
}
