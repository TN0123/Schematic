"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { FileText, StickyNote, Trash2 } from "lucide-react";
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
}

const MemoizedDateTimeDisplay = memo(DateTimeDisplay);

const shortcutIcons = {
  DOCUMENT: FileText,
  BULLETIN: StickyNote,
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function DashboardClient({
  userId,
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
          <MemoizedDateTimeDisplay />
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
      </div>
    </main>
  );
}

export default memo(DashboardClient);
