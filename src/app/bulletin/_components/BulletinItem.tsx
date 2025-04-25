"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Trash2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Save,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
//import { FontSize } from "@tiptap/extension-font-size";

interface BulletinItemProps {
  id: string;
  initialTitle: string;
  initialContent?: string;
  onSave: (
    id: string,
    updates: { title?: string; content?: string }
  ) => Promise<void>;
  onDelete?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export default function BulletinItem({
  id,
  initialTitle,
  initialContent = "",
  onSave,
  onDelete,
  onExpand,
  onCollapse,
}: BulletinItemProps) {
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasUnsavedChanges(true);
  };

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    return (
      <div className="border-b border-light-border pb-2 mb-2 flex gap-1 flex-wrap items-center dark:border-dark-divider transition-all">
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
    <div className="bg-light-background border border-light-border shadow-sm w-full h-full dark:bg-dark-background dark:border-dark-divider transition-all">
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 mb-2 text-center dark:bg-dark-inputBackground dark:text-dark-textPrimary dark:focus:ring-dark-accent"
            placeholder="Enter title..."
          />
          <div className="flex gap-2 ml-2">
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 text-light-icon rounded-lg transition-colors
                  hover:text-light-accent hover:bg-light-hover dark:text-dark-icon dark:hover:text-dark-accent dark:hover:bg-dark-hover
                  ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="Save changes"
              >
                <Save className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-light-icon hover:text-light-danger hover:bg-light-dangerHover rounded-lg transition-colors dark:text-dark-icon dark:hover:text-dark-danger dark:hover:bg-dark-dangerHover"
              aria-label="Delete item"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative border rounded-lg p-3 flex-grow flex flex-col dark:border-dark-divider dark:bg-dark-secondary">
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
