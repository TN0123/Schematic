import { Plus, FileUp, RefreshCw } from "lucide-react";
import EventSuggestion from "./EventSuggestion";
import { Event } from "../page";
import { useState } from "react";

interface EventGenerationPanelProps {
  setShowModal: (show: boolean) => void;
  setIsFileUploaderModalOpen: (open: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  fetchSuggestions: () => void;
  suggestedEvents: Event[];
  handleAcceptSuggestion: (event: Event) => void;
  handleRejectSuggestion: (eventId: string) => void;
  suggestionsLoading: boolean;
}

export default function EventGenerationPanel({
  setShowModal,
  setIsFileUploaderModalOpen,
  inputText,
  setInputText,
  loading,
  handleSubmit,
  fetchSuggestions,
  suggestedEvents,
  handleAcceptSuggestion,
  handleRejectSuggestion,
  suggestionsLoading,
}: EventGenerationPanelProps) {
  return (
    <aside className="w-96 bg-white dark:bg-dark-background border-l dark:border-dark-divider px-6 py-4 flex flex-col gap-4">
      {/* Menu Bar */}
      <div className="flex" id="event-menu-bar">
        <button
          className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} />
        </button>
        <button
          className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
          onClick={() => setIsFileUploaderModalOpen(true)}
        >
          <FileUp size={20} />
        </button>
      </div>

      <div id="event-adder">
        <div className="relative">
          <textarea
            className="flex p-4 h-auto resize-none bg-gray-100 dark:bg-dark-paper focus:outline-none border dark:border-dark-divider rounded-br-md rounded-bl-md text-black dark:text-dark-textPrimary w-full"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onInput={(e) => {
              const textarea = e.target as HTMLTextAreaElement;
              textarea.style.height = "auto";
              textarea.style.height = `${Math.min(
                textarea.scrollHeight,
                140
              )}px`;
            }}
            placeholder="Enter your schedule here..."
          />
          <button
            className="absolute bottom-2 right-2 p-1 bg-gray-200 dark:bg-dark-actionDisabledBackground hover:bg-gray-300 dark:hover:bg-dark-actionHover rounded-full transition-colors duration-200"
            onClick={() => setInputText("")}
          >
            <RefreshCw
              size={16}
              className="text-black dark:text-dark-textPrimary"
            />
          </button>
        </div>

        <button
          className="w-full py-3 mt-2 rounded-xl bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      <div
        className="w-full border-t dark:border-dark-divider"
        id="suggested-events"
      >
        <div className="flex items-center justify-between px-2 w-full">
          <h1 className="text-md py-2 text-black dark:text-dark-textPrimary">
            Suggested
          </h1>
          <button className="px-2" onClick={fetchSuggestions}>
            <div className="flex items-center justify-center gap-2">
              <RefreshCw
                className="hover:text-blue-500 dark:hover:text-blue-400 transition-all duration-200"
                size={16}
              />
            </div>
          </button>
        </div>
        {suggestedEvents.length > 0 && (
          <div className="w-full flex flex-col justify-center items-center">
            {suggestedEvents.map((suggestedEvent) => (
              <EventSuggestion
                suggestedEvent={suggestedEvent}
                key={suggestedEvent.id}
                onAccept={handleAcceptSuggestion}
                onReject={handleRejectSuggestion}
              />
            ))}
          </div>
        )}
        {suggestionsLoading && (
          <div className="w-full flex justify-center items-center">
            <RefreshCw
              size={24}
              className="animate-spin text-black dark:text-dark-textPrimary"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
