"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, Clock, Plus, X, Loader2, Edit3, CheckCircle } from "lucide-react";
import { detectEventMentions, DetectedEvent } from "./utils/eventDetection";

interface EventMentionPopupProps {
  eventText: string;
  position: { x: number; y: number };
  onCreateEvent: (eventData: { title: string; start: Date; end: Date }) => Promise<void>;
  onClose: () => void;
  userId: string;
  visible: boolean;
}

export default function EventMentionPopup({
  eventText,
  position,
  onCreateEvent,
  onClose,
  userId,
  visible,
}: EventMentionPopupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [detectedEvents, setDetectedEvents] = useState<DetectedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [editedEvents, setEditedEvents] = useState<{ [key: number]: { title: string; date: string; startTime: string; endTime: string } }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEventTitle, setSuccessEventTitle] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && eventText) {
      detectEvents();
    }
  }, [visible, eventText, userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [visible, onClose]);

  const detectEvents = async () => {
    setIsLoading(true);
    setError(null);
    console.log("Starting event detection for:", eventText);
    try {
      const events = await detectEventMentions(eventText, userId);
      console.log("Detection result:", events);
      setDetectedEvents(events);
      
      if (events.length === 0) {
        console.log("No events detected for text:", eventText);
      }
    } catch (err) {
      console.error("Error detecting events:", err);
      setError(`Failed to analyze event text: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (event: DetectedEvent, index: number) => {
    setIsLoading(true);
    try {
      const editedEvent = editedEvents[index];
      let startDate: Date;
      let endDate: Date;
      
      if (editedEvent) {
        // Use edited values
        const startDateStr = `${editedEvent.date}T${editedEvent.startTime}`;
        const endDateStr = `${editedEvent.date}T${editedEvent.endTime}`;
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
      } else {
        // Use original values
        startDate = new Date(event.start);
        endDate = new Date(event.end);
      }
      
      const eventData = {
        title: editedEvent?.title || event.title,
        start: startDate,
        end: endDate,
      };
      
      await onCreateEvent(eventData);
      
      // Show success message briefly
      setSuccessEventTitle(eventData.title);
      setShowSuccess(true);
      
      // Close popup after showing success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Failed to create event");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditEvent = (index: number, event: DetectedEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    setEditedEvents(prev => ({
      ...prev,
      [index]: {
        title: event.title,
        date: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        startTime: startDate.toTimeString().slice(0, 5), // HH:MM format
        endTime: endDate.toTimeString().slice(0, 5), // HH:MM format
      }
    }));
    setEditingEvent(index);
  };
  
  const handleSaveEdit = (index: number) => {
    setEditingEvent(null);
  };
  
  const handleCancelEdit = (index: number) => {
    setEditedEvents(prev => {
      const newEdited = { ...prev };
      delete newEdited[index];
      return newEdited;
    });
    setEditingEvent(null);
  };
  
  const updateEditedEvent = (index: number, field: string, value: string) => {
    setEditedEvents(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg shadow-lg p-4 min-w-[280px] max-w-[400px]"
      style={{
        left: Math.min(position.x, window.innerWidth - 400),
        top: Math.min(position.y + 10, window.innerHeight - 300),
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm dark:text-dark-textPrimary">
            Create Event
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-dark-actionHover rounded-md transition-colors"
        >
          <X className="h-4 w-4 text-gray-400 dark:text-dark-textSecondary" />
        </button>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Detected text:
        </div>
        <div className="text-sm bg-gray-50 dark:bg-dark-secondary p-2 rounded border border-gray-200 dark:border-dark-divider italic text-gray-700 dark:text-dark-textPrimary">
          "{eventText}"
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-dark-textSecondary" />
          <span className="ml-2 text-sm text-gray-500 dark:text-dark-textSecondary">Analyzing...</span>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          {error}
        </div>
      )}
      
      {showSuccess && (
        <div className="text-green-600 dark:text-green-400 text-sm mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>Event "{successEventTitle}" created successfully!</span>
        </div>
      )}

      {!isLoading && !error && !showSuccess && detectedEvents.length === 0 && (
        <div className="text-gray-500 dark:text-dark-textSecondary text-sm text-center py-4">
          <div>No events detected in this text</div>
          <div className="text-xs mt-1 text-gray-400 dark:text-dark-textDisabled">
            Try phrases like "meeting at 3pm" or "dinner 6pm-7pm"
          </div>
        </div>
      )}

      {!isLoading && !error && !showSuccess && detectedEvents.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Suggested events:
          </div>
          {detectedEvents.map((event, index) => {
            const isEditing = editingEvent === index;
            const editedEvent = editedEvents[index];
            const displayTitle = editedEvent?.title || event.title;
            const displayStart = editedEvent ? new Date(`${editedEvent.date}T${editedEvent.startTime}`) : new Date(event.start);
            const displayEnd = editedEvent ? new Date(`${editedEvent.date}T${editedEvent.endTime}`) : new Date(event.end);
            
            return (
              <div
                key={index}
                className="border border-gray-200 dark:border-dark-divider rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-dark-actionHover"
              >
                {isEditing ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Event Title</label>
                      <input
                        type="text"
                        value={editedEvent?.title || ''}
                        onChange={(e) => updateEditedEvent(index, 'title', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-dark-divider rounded-md bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Event title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        value={editedEvent?.date || ''}
                        onChange={(e) => updateEditedEvent(index, 'date', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-dark-divider rounded-md bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={editedEvent?.startTime || ''}
                          onChange={(e) => updateEditedEvent(index, 'startTime', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-dark-divider rounded-md bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</label>
                        <input
                          type="time"
                          value={editedEvent?.endTime || ''}
                          onChange={(e) => updateEditedEvent(index, 'endTime', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-dark-divider rounded-md bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleCancelEdit(index)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(index)}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm dark:text-dark-textPrimary mb-1">
                        {displayTitle}
                      </div>
                                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-textSecondary">
                        <Clock className="h-3 w-3" />
                        <span>{formatDateTime(displayStart.toISOString())}</span>
                        <span>- {formatDateTime(displayEnd.toISOString())}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditEvent(index, event)}
                        disabled={isLoading}
                                                  className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-gray-700 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover text-xs rounded-md transition-colors"
                        title="Edit event details"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleCreateEvent(event, index)}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs rounded-md transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-divider">
        <div className="text-xs text-gray-400 dark:text-dark-textDisabled">
          Tip: Click the edit icon to modify event details before adding
        </div>
      </div>
    </div>
  );
}
