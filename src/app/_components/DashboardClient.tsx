"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { FileText, StickyNote, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardChat from "./DashboardChat";
import DateTimeDisplay from "./DateTimeDisplay";

type ShortcutTargetType = "DOCUMENT" | "BULLETIN";

interface Shortcut {
  id: string;
  targetType: ShortcutTargetType;
  targetId: string;
  x: number;
  y: number;
  title?: string | null;
}

interface DashboardClientProps {
  userId: string | undefined;
  recentDocuments: Array<{ id: string; title: string }>;
  bulletinNotes: Array<{ id: string; title: string; type: string }>;
  goals: Array<{ id: string; title: string; type: string; createdAt: Date }>;
  totalGoalsCount: number;
}

const MemoizedDateTimeDisplay = memo(DateTimeDisplay);

const shortcutIcons = {
  DOCUMENT: FileText,
  BULLETIN: StickyNote,
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function DashboardClient({
  userId,
  recentDocuments,
  bulletinNotes,
}: DashboardClientProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const shortcutsRef = useRef<Shortcut[]>([]);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);
  const lastDragTimeRef = useRef(0);

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingPlacement, setPendingPlacement] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isLoadingShortcuts, setIsLoadingShortcuts] = useState(false);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    let isMounted = true;

    async function loadShortcuts() {
      if (!userId) {
        return;
      }
      setIsLoadingShortcuts(true);
      try {
        const response = await fetch("/api/shortcuts");
        if (!response.ok) {
          throw new Error("Failed to load shortcuts");
        }
        const data = (await response.json()) as Shortcut[];
        if (isMounted) {
          setShortcuts(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setIsLoadingShortcuts(false);
        }
      }
    }

    loadShortcuts();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    function handleMove(event: globalThis.PointerEvent) {
      const dragState = dragRef.current;
      const container = containerRef.current;

      if (!dragState || !container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextX = clamp(
        (event.clientX - rect.left - dragState.offsetX) / rect.width
      );
      const nextY = clamp(
        (event.clientY - rect.top - dragState.offsetY) / rect.height
      );

      if (
        Math.abs(event.clientX - dragState.startX) > 3 ||
        Math.abs(event.clientY - dragState.startY) > 3
      ) {
        dragState.hasMoved = true;
      }

      setShortcuts((prev) =>
        prev.map((shortcut) =>
          shortcut.id === dragState.id
            ? { ...shortcut, x: nextX, y: nextY }
            : shortcut
        )
      );
    }

    async function handleUp() {
      const dragState = dragRef.current;

      if (!dragState) {
        return;
      }

      dragRef.current = null;
      setDraggingId(null);

      if (dragState.hasMoved) {
        lastDragTimeRef.current = Date.now();
      }

      const shortcut = shortcutsRef.current.find(
        (item) => item.id === dragState.id
      );

      if (!shortcut) {
        return;
      }

      try {
        await fetch(`/api/shortcuts/${dragState.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: shortcut.x, y: shortcut.y }),
        });
      } catch (error) {
        console.error(error);
      }
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const handleDoubleClick = (event: MouseEvent<HTMLElement>) => {
    if (!userId || isPickerOpen || draggingId) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    setPendingPlacement({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setIsPickerOpen(true);
    setContextMenu(null);
  };

  const handleCreateShortcut = async (
    targetType: ShortcutTargetType,
    targetId: string
  ) => {
    if (!pendingPlacement || !containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = clamp(pendingPlacement.x / rect.width);
    const y = clamp(pendingPlacement.y / rect.height);

    try {
      const response = await fetch("/api/shortcuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, x, y }),
      });

      if (!response.ok) {
        throw new Error("Failed to create shortcut");
      }

      const created = (await response.json()) as Shortcut;
      setShortcuts((prev) => [...prev, created]);
      setIsPickerOpen(false);
      setPendingPlacement(null);
    } catch (error) {
      console.error(error);
      setMessage("Unable to create shortcut right now.");
    }
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    shortcut: Shortcut
  ) => {
    if (event.button !== 0) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    const rect = container.getBoundingClientRect();
    const shortcutX = shortcut.x * rect.width;
    const shortcutY = shortcut.y * rect.height;

    dragRef.current = {
      id: shortcut.id,
      offsetX: event.clientX - rect.left - shortcutX,
      offsetY: event.clientY - rect.top - shortcutY,
      startX: event.clientX,
      startY: event.clientY,
      hasMoved: false,
    };

    setDraggingId(shortcut.id);
  };

  const handleContextMenu = (
    event: MouseEvent<HTMLButtonElement>,
    shortcut: Shortcut
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    setContextMenu({
      id: shortcut.id,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleOpenShortcut = async (shortcut: Shortcut) => {
    if (Date.now() - lastDragTimeRef.current < 250) {
      return;
    }

    try {
      const response = await fetch(`/api/shortcuts/${shortcut.id}/open`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to open shortcut");
      }

      const data = await response.json();

      if (data?.ok) {
        router.push(data.url);
        return;
      }

      setMessage(
        "That shortcut's item no longer exists. It has been removed."
      );
      setShortcuts((prev) => prev.filter((item) => item.id !== shortcut.id));
    } catch (error) {
      console.error(error);
      setMessage("Unable to open shortcut right now.");
    }
  };

  const handleDeleteShortcut = async (shortcutId: string) => {
    setContextMenu(null);
    setShortcuts((prev) => prev.filter((item) => item.id !== shortcutId));

    try {
      await fetch(`/api/shortcuts/${shortcutId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete shortcut right now.");
    }
  };

  return (
    <main
      className="min-h-screen w-full px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background"
      onDoubleClick={handleDoubleClick}
      onClick={() => setContextMenu(null)}
    >
      <div
        ref={containerRef}
        className="mx-auto min-h-screen flex flex-col relative w-full"
      >
        {message && (
          <div className="absolute top-4 right-4 z-50 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider text-gray-700 dark:text-dark-textSecondary px-4 py-2 rounded-lg shadow">
            {message}
          </div>
        )}

        {/* Date/Time section with fixed height to prevent layout shift */}
        <div
          className="pt-10 sm:pt-12 lg:pt-16 flex justify-center"
          style={{
            // Reserve consistent space for the date/time display
            minHeight: "calc(120px + 2.5rem)",
          }}
        >
          <MemoizedDateTimeDisplay userId={userId} />
        </div>

        {/* Chat section - fills remaining space with smooth transitions */}
        <div className="flex-1 flex items-start justify-center mt-36">
          {userId && <DashboardChat userId={userId} />}
        </div>

        {shortcuts.map((shortcut) => {
          const Icon = shortcutIcons[shortcut.targetType];
          const shortcutTitle =
            shortcut.title ||
            (shortcut.targetType === "DOCUMENT"
              ? "Untitled Document"
              : "Untitled Note");
          return (
            <div
              key={shortcut.id}
              className="absolute z-30 w-0 h-0"
              style={{
                left: `${shortcut.x * 100}%`,
                top: `${shortcut.y * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <button
                type="button"
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-full bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
                onPointerDown={(event) => handlePointerDown(event, shortcut)}
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenShortcut(shortcut);
                }}
                onDoubleClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => handleContextMenu(event, shortcut)}
                aria-label={
                  shortcut.targetType === "DOCUMENT"
                    ? "Document shortcut"
                    : "Note shortcut"
                }
              >
                <Icon className="w-5 h-5 text-gray-700 dark:text-dark-textPrimary" />
              </button>
              <div className="absolute top-7 left-1/2 -translate-x-1/2 text-[11px] text-gray-600 dark:text-dark-textSecondary max-w-[96px] truncate text-center pointer-events-none">
                {shortcutTitle}
              </div>
            </div>
          );
        })}

        {contextMenu && (
          <div
            className="absolute z-50 bg-white dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-md shadow-lg"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleDeleteShortcut(contextMenu.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-dark-hover w-full"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}

        {isPickerOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60] p-4"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsPickerOpen(false);
                setPendingPlacement(null);
              }
            }}
          >
            <div
              className="bg-white dark:bg-dark-background rounded-lg shadow-xl max-w-xl w-full overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-dark-divider">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
                  Add a shortcut
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsPickerOpen(false);
                    setPendingPlacement(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-dark-textSecondary dark:hover:text-dark-textPrimary p-1"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-2">
                    Documents
                  </h3>
                  {recentDocuments.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-dark-textDisabled">
                      No recent documents.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {recentDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleCreateShortcut("DOCUMENT", doc.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md border border-gray-200 dark:border-dark-divider hover:bg-gray-50 dark:hover:bg-dark-hover text-left"
                        >
                          <FileText className="w-4 h-4 text-gray-600 dark:text-dark-textSecondary" />
                          <span className="text-sm text-gray-800 dark:text-dark-textPrimary truncate">
                            {doc.title || "Untitled Document"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-2">
                    Notes
                  </h3>
                  {bulletinNotes.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-dark-textDisabled">
                      No recent notes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {bulletinNotes.map((note) => (
                        <button
                          key={note.id}
                          type="button"
                          onClick={() => handleCreateShortcut("BULLETIN", note.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md border border-gray-200 dark:border-dark-divider hover:bg-gray-50 dark:hover:bg-dark-hover text-left"
                        >
                          <StickyNote className="w-4 h-4 text-gray-600 dark:text-dark-textSecondary" />
                          <span className="text-sm text-gray-800 dark:text-dark-textPrimary truncate">
                            {note.title || "Untitled Note"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {isLoadingShortcuts && (
                  <p className="text-xs text-gray-500 dark:text-dark-textDisabled">
                    Loading shortcuts...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom hint text */}
        <div className="mt-auto pb-4 text-center">
          <p className="text-xs italic text-gray-500 dark:text-dark-textDisabled">
            double-click to add shortcut
          </p>
        </div>
      </div>
    </main>
  );
}

export default memo(DashboardClient);
