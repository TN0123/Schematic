import { Plus, Type, FileUp, RefreshCcw } from "lucide-react";
import EventSuggestion from "./EventSuggestion";
import { Event } from "../page";

export default function EventGenerationPanel({
  setShowModal,
  inputText,
  setInputText,
  loading,
  handleSubmit,
  fetchSuggestions,
  suggestedEvents,
  handleAcceptSuggestion,
  handleRejectSuggestion,
  suggestionsLoading,
}: {
  setShowModal: (show: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  fetchSuggestions: () => void;
  suggestedEvents: Event[];
  handleAcceptSuggestion: (event: Event) => void;
  handleRejectSuggestion: (eventId: string) => void;
  suggestionsLoading: boolean;
}) {
  return (
    <aside className="w-96 bg-white border-l px-6 py-4 flex flex-col gap-4">
      {/* Menu Bar */}
      <div className="flex">
        <button
          className="hover:bg-gray-100 transition-colors duration-200 p-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={20} />
        </button>
        <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
          <Type size={20} />
        </button>
        <button className="hover:bg-gray-100 transition-colors duration-200 p-2">
          <FileUp size={20} />
        </button>
      </div>

      {/* Input Field */}
      <textarea
        className="flex p-4 h-auto resize-none bg-gray-100 focus:outline-none border rounded-br-md rounded-bl-md"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onInput={(e) => {
          const textarea = e.target as HTMLTextAreaElement;
          textarea.style.height = "auto";
          textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
        }}
        placeholder="Enter your schedule here..."
      />
      <button
        className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        disabled={loading}
        onClick={handleSubmit}
      >
        {loading ? "Generating..." : "Generate"}
      </button>
      <div className="w-full border-t">
        <div className="flex items-center justify-between px-2 w-full">
          <h1 className="text-md py-2">Suggested</h1>
          <button className="px-2" onClick={fetchSuggestions}>
            <div className="flex items-center justify-center gap-2">
              <RefreshCcw
                className="hover:text-blue-500 transition-all duration-200"
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
            <RefreshCcw size={24} className="animate-spin" />
          </div>
        )}
      </div>
    </aside>
  );
}
