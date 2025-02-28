"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Trash2,
  Minimize2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Type,
  Save,
  Maximize2,
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
  isExpanded: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export default function BulletinItem({
  id,
  initialTitle,
  initialContent = "",
  onSave,
  onDelete,
  isExpanded,
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
        class: "h-full min-h-[100px] w-full outline-none",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (
      lastSavedState.current.title !== title &&
      lastSavedState.current.content !== content
    ) {
      setHasUnsavedChanges(true);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isExpanded);
      editor.setOptions({ editable: isExpanded });
    }
  }, [isExpanded, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasUnsavedChanges(true);
  };

  const MenuBar = () => {
    if (!editor) {
      return null;
    }

    const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px"];

    return (
      <div className="border-b border-gray-200 pb-2 mb-2 flex gap-1 flex-wrap items-center">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={`p-2 rounded ${
            editor.isActive("bold") ? "bg-gray-200" : "hover:bg-gray-100"
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
            editor.isActive("italic") ? "bg-gray-200" : "hover:bg-gray-100"
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
            editor.isActive("underline") ? "bg-gray-200" : "hover:bg-gray-100"
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
      if (event.ctrlKey && event.key === "s" && isExpanded) {
        event.preventDefault();
        handleSave();
        console.log("item saved");
      }
    },
    [handleSave, isExpanded]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${
        isExpanded ? "w-full h-full" : ""
      }`}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            disabled={!isExpanded}
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-lg p-2 text-center"
            placeholder="Enter title..."
          />
          <div className="flex gap-2 ml-2">
            {isExpanded && hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`p-2 text-gray-500 rounded-lg transition-colors
                  hover:text-blue-500 hover:bg-blue-50
                  ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                aria-label="Save changes"
              >
                <Save className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={isExpanded ? onCollapse : onExpand}
              className={`p-2 text-gray-500 rounded-lg transition-colors ${
                isExpanded
                  ? "hover:text-green-500 hover:bg-green-50"
                  : "hover:text-blue-500 hover:bg-blue-50"
              }`}
              aria-label={isExpanded ? "Minimize" : "Edit"}
            >
              {isExpanded ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete item"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative border rounded-lg p-3 flex-grow flex flex-col">
          {isExpanded && <MenuBar />}
          <EditorContent
            editor={editor}
            className={`prose max-w-none focus:outline-none flex-grow overflow-y-auto ${
              isExpanded ? "max-h-[230px]" : "max-h-[150px]"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
