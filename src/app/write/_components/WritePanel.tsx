import {
  Plus,
  Type,
  FileUp,
  RefreshCcw,
  PanelRightClose,
  SendHorizonal,
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
    <aside className="w-1/3 h-full border-l-2 border-gray-300 flex flex-col">
      <div className="w-full flex items-center justify-between px-4 py-2">
        <button className="rounded-full hover:bg-gray-300 transition-colors duration-200 p-2">
          <PanelRightClose />
        </button>
      </div>
      <div className="flex flex-col w-full h-full px-4 py-2 gap-4 ">
        <div className="bg-gray-100">
          <textarea
            className="flex w-full p-4 h-auto resize-none bg-gray-100 placeholder-gray-500 focus:outline-none rounded-br-md rounded-bl-md"
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
          <div className="flex w-full justify-end items-center px-4 py-2">
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
