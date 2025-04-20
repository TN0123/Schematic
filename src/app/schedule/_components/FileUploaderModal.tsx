import { useState } from "react";

interface FileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FileUploaderModal({
  isOpen,
  onClose,
}: FileUploaderModalProps) {
  if (!isOpen) return null;

  const [file, setFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
        setStatusMessage("File uploaded successfully: " + data.result);
      } else {
        setStatusMessage("Upload failed: " + data.result);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatusMessage("An error occurred while uploading.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Upload File
        </h2>
        <div className="mb-6">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-100 file:text-blue-700
                       hover:file:bg-blue-200 dark:file:bg-gray-700 dark:file:text-gray-300
                       dark:hover:file:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          />
        </div>
        {statusMessage && (
          <p className="text-sm text-center mb-4 text-gray-700 dark:text-gray-300">
            {statusMessage}
          </p>
        )}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all"
          >
            Generate Events
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
