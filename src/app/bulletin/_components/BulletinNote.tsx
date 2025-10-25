"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isPrimaryModifierPressed } from "@/components/utils/platform";
import {
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Save,
  Loader2,
  NotepadText,
  Clock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { EventMention } from "./extensions/EventMention";
import EventMentionPopup from "./EventMentionPopup";
import { useSession } from "next-auth/react";

interface BulletinNoteProps {
  id: string;
  initialTitle: string;
  initialContent?: string;
  updatedAt: Date;
  onSave: (
    id: string,
    updates: { title?: string; content?: string }
  ) => Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
}

export default function BulletinNote({
  id,
  initialTitle,
  initialContent = "",
  updatedAt,
  onSave,
  onDelete,
  isSaving: externalIsSaving = false,
}: BulletinNoteProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showEventPopup, setShowEventPopup] = useState(false);
  const [eventPopupData, setEventPopupData] = useState<{
    text: string;
    position: { x: number; y: number };
  } | null>(null);
  const { data: session } = useSession();
  const lastSavedState = useRef({
    title: initialTitle,
    content: initialContent,
  });

  // Debounced save for content
  const debouncedSaveContent = useDebouncedCallback(
    async (newContent: string) => {
      if (newContent !== lastSavedState.current.content) {
        setIsAutoSaving(true);
        try {
          await onSave(id, { content: newContent });
          lastSavedState.current.content = newContent;

          // Update hasUnsavedChanges based on both title and content
          const titleChanged = title !== lastSavedState.current.title;
          const contentChanged = newContent !== lastSavedState.current.content;
          setHasUnsavedChanges(titleChanged || contentChanged);
        } catch (error) {
          console.error("Failed to auto-save content:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }
    },
    1000
  );

  // Debounced save for title
  const debouncedSaveTitle = useDebouncedCallback(async (newTitle: string) => {
    if (newTitle !== lastSavedState.current.title) {
      setIsAutoSaving(true);
      try {
        await onSave(id, { title: newTitle });
        lastSavedState.current.title = newTitle;

        // Update hasUnsavedChanges based on both title and content
        const titleChanged = newTitle !== lastSavedState.current.title;
        const contentChanged = content !== lastSavedState.current.content;
        setHasUnsavedChanges(titleChanged || contentChanged);
      } catch (error) {
        console.error("Failed to auto-save title:", error);
      } finally {
        setIsAutoSaving(false);
      }
    }
  }, 800);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: "my-bullet-list",
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: "my-ordered-list",
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: "my-list-item",
        },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      EventMention.configure({
        HTMLAttributes: {
          class: "event-mention-suggestion",
        },
        onEventHover: (
          eventText: string,
          range: { from: number; to: number },
          element: HTMLElement
        ) => {
          const rect = element.getBoundingClientRect();
          setEventPopupData({
            text: eventText,
            position: {
              x: rect.left + window.scrollX,
              y: rect.bottom + window.scrollY,
            },
          });
          setShowEventPopup(true);
        },
        onEventLeave: () => {
          // Add a small delay to prevent flickering when moving between popup and text
          setTimeout(() => {
            setShowEventPopup(false);
            setEventPopupData(null);
          }, 150);
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      setContent(htmlContent);
      const hasChanges =
        title != lastSavedState.current.title ||
        htmlContent != lastSavedState.current.content;
      setHasUnsavedChanges(hasChanges);

      // Trigger debounced save for content
      debouncedSaveContent(htmlContent);
    },
    editable: true,
    editorProps: {
      attributes: {
        class:
          "h-full min-h-[100px] w-full outline-none dark:bg-dark-editorBackground dark:text-dark-textPrimary [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:my-1",
      },
    },
    immediatelyRender: false,
  });

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    return (
      <div className="border-y border-gray-200 dark:border-dark-divider px-4 py-2 flex gap-0.5 flex-wrap items-center transition-all">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("bold")
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("italic")
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("underline")
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().setTextAlign("left").run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive({ textAlign: "left" })
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().setTextAlign("center").run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive({ textAlign: "center" })
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().setTextAlign("right").run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive({ textAlign: "right" })
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("bulletList")
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive("orderedList")
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover hover:text-gray-700 dark:hover:text-dark-textPrimary"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates: { title?: string; content?: string } = {};
      if (title !== lastSavedState.current.title) updates.title = title;
      if (content !== lastSavedState.current.content) updates.content = content;

      if (Object.keys(updates).length > 0) {
        await onSave(id, updates);

        lastSavedState.current = {
          title,
          content,
        };

        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [content, id, onSave, title]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (isPrimaryModifierPressed(event) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
        console.log("item saved");
      }
    },
    [handleSave]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasUnsavedChanges) {
        handleSave();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        handleSave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, handleSave]);

  // Handle event creation from popup
  const handleCreateEvent = useCallback(
    async (eventData: { title: string; start: Date; end: Date }) => {
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          throw new Error("Failed to create event");
        }

        // Event created successfully - the popup will handle showing success message
        // and closing itself
      } catch (error) {
        console.error("Error creating event:", error);
        throw error;
      }
    },
    []
  );

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4 px-4 pt-4 flex-shrink-0">
        <div className="flex items-center w-full gap-3">
          <NotepadText className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div className="flex flex-col w-full">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                setHasUnsavedChanges(true);

                // Trigger debounced save for title
                debouncedSaveTitle(newTitle);
              }}
              className="font-semibold text-xl text-left w-full focus:outline-none border-none bg-transparent dark:text-dark-textPrimary placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Untitled"
            />
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 flex-shrink-0">
          {isAutoSaving && (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          )}
          {hasUnsavedChanges && !isAutoSaving && (
            <button
              onClick={handleSave}
              disabled={isSaving || externalIsSaving}
              className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-dark-textPrimary dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save changes"
            >
              {isSaving || externalIsSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 dark:text-dark-textPrimary dark:hover:bg-red-900/50 dark:hover:text-red-500 rounded-lg transition-all"
            aria-label="Delete list"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative rounded-lg flex-1 flex flex-col dark:border-dark-divider min-h-0">
        <MenuBar />
        <EditorContent
          editor={editor}
          className="prose max-w-none focus:outline-none flex-1 overflow-y-auto dark:prose-invert p-3 min-h-0"
          style={
            {
              "--list-style": "initial",
            } as React.CSSProperties
          }
        />
      </div>

      {/* Event Mention Popup */}
      {showEventPopup && eventPopupData && session?.user?.id && (
        <EventMentionPopup
          eventText={eventPopupData.text}
          position={eventPopupData.position}
          onCreateEvent={handleCreateEvent}
          onClose={() => {
            setShowEventPopup(false);
            setEventPopupData(null);
          }}
          userId={session.user.id}
          visible={showEventPopup}
        />
      )}
    </div>
  );
}
