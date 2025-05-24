"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Save,
  Loader2,
  NotepadText,
  Clock,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { formatDistanceToNow } from "date-fns";
//import { FontSize } from "@tiptap/extension-font-size";

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
}

export default function BulletinNote({
  id,
  initialTitle,
  initialContent = "",
  updatedAt,
  onSave,
  onDelete,
}: BulletinNoteProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedState = useRef({
    title: initialTitle,
    content: initialContent,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      Underline,
      TextStyle,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const htmlContent = editor.getHTML();
      setContent(htmlContent);
      const hasChanges =
        title != lastSavedState.current.title ||
        htmlContent != lastSavedState.current.content;
      setHasUnsavedChanges(hasChanges);
    },
    editable: true,
    editorProps: {
      attributes: {
        class:
          "h-full min-h-[100px] w-full outline-none dark:bg-dark-editorBackground dark:text-dark-textPrimary",
      },
    },
    immediatelyRender: false,
  });

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    return (
      <div className="border-y py-2 mb-2 flex gap-1 flex-wrap items-center dark:border-dark-divider transition-all">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`p-2 rounded ${
            editor.isActive("bold")
              ? "bg-light-active dark:bg-dark-active"
              : "hover:bg-light-hover dark:hover:bg-dark-hover"
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
          className={`p-2 rounded ${
            editor.isActive("italic")
              ? "bg-light-active dark:bg-dark-active"
              : "hover:bg-light-hover dark:hover:bg-dark-hover"
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
          className={`p-2 rounded ${
            editor.isActive("underline")
              ? "bg-light-active dark:bg-dark-active"
              : "hover:bg-light-hover dark:hover:bg-dark-hover"
          }`}
        >
          <UnderlineIcon className="h-4 w-4" />
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
      if (event.ctrlKey && event.key === "s") {
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

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all">
      <div className="p-3 h-full flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <NotepadText className="h-10 w-10 mx-4 text-green-500" />
            <div className="flex flex-col">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="font-semibold text-2xl text-left w-full focus:outline-none focus:ring-2 focus:ring-gray-100 dark:focus:ring-dark-secondary rounded-lg p-2 dark:text-dark-textPrimary"
                placeholder="Enter title..."
              />
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last modified{" "}
                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </div>
            </div>
          </div>
          <div className="flex gap-2 ml-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 rounded-lg transition-colors
                  text-light-icon hover:text-light-accent hover:bg-light-hover
                  dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="Save changes"
              >
                {isSaving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-light-icon hover:bg-red-300 dark:hover:bg-red-900 rounded-lg transition-all"
              aria-label="Delete item"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative rounded-lg flex-grow flex flex-col dark:border-dark-divider">
          <MenuBar />
          <EditorContent
            editor={editor}
            className={`prose max-w-none focus:outline-none flex-grow overflow-y-auto max-h-[480px] dark:prose-invert`}
          />
        </div>
      </div>
    </div>
  );
}
