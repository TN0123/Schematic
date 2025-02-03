import { EventImpl } from "@fullcalendar/core/internal";

interface DeleteEventModalProps {
  isOpen: boolean;
  event: EventImpl | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteEventModal({
  isOpen,
  event,
  onClose,
  onConfirm,
}: DeleteEventModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Delete Event
        </h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{event?.title}"?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
