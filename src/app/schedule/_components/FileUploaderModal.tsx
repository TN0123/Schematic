import { useState, useEffect } from "react";
import { UploadIcon, CalendarIcon } from "lucide-react";
import EventReviewModal from "./EventReviewModal";
import { ExtractedEvent } from "./EventReviewModal";
import { Event } from "../page";

interface FileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  setEvents: (events: Event[]) => void;
}

export default function FileUploaderModal({
  isOpen,
  onClose,
  setEvents,
}: FileUploaderModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [extractedEvents, setExtractedEvents] = useState<
    ExtractedEvent[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setStatusMessage(null);
      setExtractedEvents(null);
    }
  }, [isOpen]);

  const handleUpload = async () => {
    if (!file) {
      setStatusMessage("Please select a file first.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.events.length === 0) {
          setStatusMessage("No events found in the PDF.");
        } else {
          setExtractedEvents(data.events);
        }
      } else {
        setStatusMessage("Upload failed, service is down");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatusMessage("An error occurred while uploading.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setFile(null);
    setExtractedEvents(null);
    setStatusMessage(null);
  };

  const onAddAll = (selectedEvents: ExtractedEvent[]) => {
    const formattedEvents = selectedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start),
      end: new Date(event.end),
    }));
    setEvents(formattedEvents);
    setFile(null);
    setStatusMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
            Import Calendar Events
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-textSecondary text-lg font-bold"
          >
            ×
          </button>
        </div>
        {extractedEvents ? (
          <EventReviewModal
            events={extractedEvents}
            onBack={handleBack}
            onAddAll={onAddAll}
          />
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-dark-textSecondary mb-4">
              Upload a PDF document to extract events for your calendar.
            </p>

            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-divider rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-dark-actionHover mb-6"
              onClick={() => document.getElementById("pdfInput")?.click()}
            >
              <UploadIcon className="w-8 h-8 text-gray-500 dark:text-dark-textSecondary mb-2" />
              {file ? (
                <p className="text-sm font-medium text-gray-800 dark:text-dark-textPrimary">
                  {file.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                  Click to select a PDF file
                </p>
              )}
              <input
                id="pdfInput"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>

            {statusMessage && (
              <p className="text-sm text-center mb-4 text-gray-700 dark:text-dark-textSecondary">
                {statusMessage}
              </p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleUpload}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 ${
                  isLoading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                } text-white rounded-md transition`}
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4" />
                    Extract Events
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
