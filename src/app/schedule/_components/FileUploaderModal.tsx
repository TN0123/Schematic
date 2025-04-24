import { useState, useEffect } from "react";
import { UploadIcon } from "lucide-react";
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
        setStatusMessage("Upload failed: " + data.events);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatusMessage("An error occurred while uploading.");
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {extractedEvents ? (
          <EventReviewModal
            events={extractedEvents}
            onBack={handleBack}
            onAddAll={onAddAll}
          />
        ) : (
          <>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Import Calendar Events
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload a PDF document to extract events for your calendar.
            </p>

            <div
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 mb-6"
              onClick={() => document.getElementById("pdfInput")?.click()}
            >
              <UploadIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 mb-2" />
              {file ? (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {file.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
              <p className="text-sm text-center mb-4 text-gray-700 dark:text-gray-300">
                {statusMessage}
              </p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleUpload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md transition"
              >
                <UploadIcon className="w-4 h-4" />
                Upload and Extract Events
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
