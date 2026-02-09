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
      className="h-screen w-full px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background overflow-hidden"
      onClick={() => setContextMenu(null)}
    >
      <div
        ref={containerRef}
        className="mx-auto h-full flex flex-col relative w-full"
      >
        {/* Toast notification */}
        {message && (
          <div className="absolute top-4 right-4 z-50 bg-white/90 dark:bg-white/[0.06] backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.08] text-gray-700 dark:text-white/70 px-4 py-2.5 rounded-xl shadow-lg dark:shadow-black/30 text-sm animate-fade-in">
            {message}
          </div>
        )}

        {/* Date/Time section */}
        <div className="pt-8 sm:pt-10 lg:pt-14 flex justify-center flex-shrink-0">
          <MemoizedDateTimeDisplay />
        </div>

        {/* Chat section — takes remaining space, properly contained */}
        <div className="flex-1 min-h-0 flex items-start justify-center pt-8 sm:pt-12 pb-6 sm:pb-10">
          {userId && <DashboardChat userId={userId} />}
        </div>

        {/* Desktop shortcuts */}
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
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-xl bg-white/80 dark:bg-white/[0.06] backdrop-blur-sm border border-gray-200/60 dark:border-white/[0.08] shadow-sm hover:shadow-md dark:hover:bg-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.14] transition-all duration-200 cursor-grab active:cursor-grabbing ${
                  draggingId === shortcut.id ? "opacity-70 scale-105" : ""
                }`}
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
                <Icon className="w-4.5 h-4.5 text-gray-600 dark:text-white/70" />
              </button>
              <div className="absolute top-7 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 dark:text-white/40 max-w-[96px] truncate text-center pointer-events-none select-none">
                {shortcutTitle}
              </div>
            </div>
          );
        })}

        {/* Context menu */}
        {contextMenu && (
          <div
            className="absolute z-50 bg-white/95 dark:bg-[#1e1e1e] backdrop-blur-xl border border-gray-200/60 dark:border-white/[0.1] rounded-xl shadow-xl dark:shadow-black/40 overflow-hidden"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleDeleteShortcut(contextMenu.id)}
              className="flex items-center gap-2 px-3.5 py-2 text-[13px] text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.08] w-full transition-colors duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default memo(DashboardClient);
