import { useState, useEffect } from "react";
import { UploadIcon, CalendarIcon, Info } from "lucide-react";
import EventReviewModal from "./EventReviewModal";
import { ExtractedEvent } from "./EventReviewModal";
import { Event } from "../page";

interface IcsUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  setEvents: (events: Event[]) => void;
}

export default function IcsUploaderModal({
  isOpen,
  onClose,
  setEvents,
}: IcsUploaderModalProps) {
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
      const response = await fetch("/api/upload-ics", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        if (data.events.length === 0) {
          setStatusMessage("No events found in the ICS file.");
        } else {
          setExtractedEvents(data.events);
        }
      } else {
        setStatusMessage(data.message || "Upload failed, service is down");
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
      <div className="bg-white dark:bg-dark-secondary rounded-xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
            Import from Google Calendar (.ics)
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <Info
                  className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-3 mt-1"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-md font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    How to export your Google Calendar
                  </h3>
                  <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-300/80 space-y-1">
                    <li>On your computer, open Google Calendar.</li>
                    <li>
                      Find "My calendars" on the left, hover over a calendar,
                      click the three dots, and select{" "}
                      <strong>Settings and sharing</strong>.
                    </li>
                    <li>
                      Under "Calendar settings," click{" "}
                      <strong>Export calendar</strong>.
                    </li>
                    <li>An .ics file of your events will download.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-divider rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-dark-actionHover mb-6"
              onClick={() => document.getElementById("icsFileInput")?.click()}
            >
              <UploadIcon className="w-8 h-8 text-gray-500 dark:text-dark-textSecondary mb-2" />
              {file ? (
                <p className="text-sm font-medium text-gray-800 dark:text-dark-textPrimary">
                  {file.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                  Click to select .ics file
                </p>
              )}
              <input
                id="icsFileInput"
                type="file"
                accept=".ics"
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
