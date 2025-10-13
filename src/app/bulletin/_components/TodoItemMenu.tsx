import { MoreVertical, Calendar } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TodoItemMenuProps {
  onSetDueDate: () => void;
}

export default function TodoItemMenu({ onSetDueDate }: TodoItemMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSetDueDate = () => {
    setIsOpen(false);
    onSetDueDate();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-dark-hover dark:hover:text-gray-300 mt-0.5"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-background border border-gray-200 dark:border-dark-divider rounded-lg shadow-lg z-50">
          <button
            onClick={handleSetDueDate}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-dark-textPrimary hover:bg-gray-50 dark:hover:bg-dark-hover rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span>Set due date</span>
          </button>
        </div>
      )}
    </div>
  );
}
