import {
  Plus,
  FileUp,
  RefreshCw,
  PanelRightOpen,
  PanelRightClose,
  CalendarPlus,
} from "lucide-react";
import { useState } from "react";

interface EventGenerationPanelProps {
  setShowModal: (show: boolean) => void;
  setIsFileUploaderModalOpen: (open: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
}

export default function EventGenerationPanel({
  setShowModal,
  setIsFileUploaderModalOpen,
  setIsIcsUploaderModalOpen,
  inputText,
  setInputText,
  loading,
  handleSubmit,
}: EventGenerationPanelProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleToggle = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      <aside
        className={`hidden md:flex fixed md:relative z-30 h-full w-80 md:w-96 bg-white dark:bg-dark-background border-l dark:border-dark-divider px-6 py-4 flex-col gap-4 transition-all duration-300`}
      >
        {/* Menu Bar */}
        <div className="flex" id="event-menu-bar">
          {isMobileOpen && (
            <button
              onClick={handleToggle}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
            >
              <PanelRightClose
                size={24}
                className="text-gray-700 dark:text-dark-textSecondary"
              />
            </button>
          )}
          <button
            className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
            onClick={() => {
              setShowModal(true);
              setIsMobileOpen(false);
            }}
          >
            <Plus size={20} />
          </button>
          <button
            className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
            onClick={() => {
              setIsFileUploaderModalOpen(true);
              setIsMobileOpen(false);
            }}
          >
            <FileUp size={20} />
          </button>
          <button
            className="hover:bg-gray-100 dark:hover:bg-dark-actionHover transition-colors duration-200 p-2"
            onClick={() => {
              setIsIcsUploaderModalOpen(true);
              setIsMobileOpen(false);
            }}
          >
            <CalendarPlus size={20} />
          </button>
        </div>

        <div id="event-adder">
          <div className="relative">
            <textarea
              className="flex w-full p-4 h-auto resize-none border dark:border-dark-divider placeholder-gray-500 dark:placeholder-dark-textDisabled rounded-xl focus:outline-none bg-transparent dark:text-dark-textPrimary text-sm"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onInput={(e) => {
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(
                  textarea.scrollHeight,
                  300
                )}px`;
              }}
              placeholder="Enter your schedule here..."
            />
          </div>

          <button
            className="w-full py-2 mt-2 rounded-lg bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            disabled={loading}
            onClick={() => {
              handleSubmit();
              setIsMobileOpen(false);
            }}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </aside>
    </>
  );
}
