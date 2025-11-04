"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isPrimaryModifierPressed } from "@/components/utils/platform";
import { Trash2, Save, Loader2, Pilcrow, Eye, Code } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import { useSession } from "next-auth/react";

interface BulletinMarkdownProps {
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

export default function BulletinMarkdown({
  id,
  initialTitle,
  initialContent = "",
  updatedAt,
  onSave,
  onDelete,
  isSaving: externalIsSaving = false,
}: BulletinMarkdownProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">(
    "split"
  );
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

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all flex flex-col">
      <div className="flex justify-between items-start mb-4 px-4 pt-4 flex-shrink-0">
        <div className="flex items-center w-full gap-3">
          <Pilcrow className="h-8 w-8 text-green-500 flex-shrink-0" />
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
            aria-label="Delete note"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-center gap-2 px-4 pb-2 border-b border-gray-200 dark:border-dark-divider">
        <button
          type="button"
          onClick={() => setViewMode("edit")}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
            viewMode === "edit"
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover"
          }`}
        >
          <Code className="h-4 w-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => setViewMode("split")}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
            viewMode === "split"
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover"
          }`}
        >
          <Pilcrow className="h-4 w-4" />
          Split
        </button>
        <button
          type="button"
          onClick={() => setViewMode("preview")}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
            viewMode === "preview"
              ? "bg-gray-200 dark:bg-dark-actionSelected text-gray-800 dark:text-dark-textPrimary"
              : "text-gray-500 dark:text-dark-textPrimary hover:bg-gray-100 dark:hover:bg-dark-actionHover"
          }`}
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
      </div>

      {/* Editor and Preview */}
      <div className="relative rounded-lg flex-1 flex dark:border-dark-divider min-h-0">
        {viewMode === "edit" || viewMode === "split" ? (
          <div
            className={`${
              viewMode === "split"
                ? "w-1/2 border-r border-gray-200 dark:border-dark-divider"
                : "w-full"
            } flex flex-col min-h-0`}
          >
            <textarea
              value={content}
              onChange={(e) => {
                const newContent = e.target.value;
                setContent(newContent);
                const hasChanges =
                  title !== lastSavedState.current.title ||
                  newContent !== lastSavedState.current.content;
                setHasUnsavedChanges(hasChanges);

                // Trigger debounced save for content
                debouncedSaveContent(newContent);
              }}
              className="flex-1 w-full p-4 outline-none resize-none font-mono text-sm dark:bg-dark-editorBackground dark:text-dark-textPrimary dark:placeholder-gray-500 placeholder-gray-400 overflow-y-auto"
              placeholder="Start writing markdown..."
            />
          </div>
        ) : null}

        {viewMode === "preview" || viewMode === "split" ? (
          <div
            className={`${
              viewMode === "split" ? "w-1/2" : "w-full"
            } flex flex-col min-h-0 overflow-y-auto`}
          >
            <div className="p-4 prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: (props) => <p {...props} className="mb-4 last:mb-0" />,
                  h1: (props) => (
                    <h1
                      {...props}
                      className="text-3xl font-bold mb-4 mt-6 first:mt-0"
                    />
                  ),
                  h2: (props) => (
                    <h2
                      {...props}
                      className="text-2xl font-bold mb-3 mt-5 first:mt-0"
                    />
                  ),
                  h3: (props) => (
                    <h3
                      {...props}
                      className="text-xl font-semibold mb-2 mt-4 first:mt-0"
                    />
                  ),
                  h4: (props) => (
                    <h4
                      {...props}
                      className="text-lg font-semibold mb-2 mt-3 first:mt-0"
                    />
                  ),
                  h5: (props) => (
                    <h5
                      {...props}
                      className="text-base font-semibold mb-2 mt-2 first:mt-0"
                    />
                  ),
                  h6: (props) => (
                    <h6
                      {...props}
                      className="text-sm font-semibold mb-2 mt-2 first:mt-0"
                    />
                  ),
                  ul: (props) => (
                    <ul {...props} className="mb-4 last:mb-0 ml-6 list-disc" />
                  ),
                  ol: (props) => (
                    <ol
                      {...props}
                      className="mb-4 last:mb-0 ml-6 list-decimal"
                    />
                  ),
                  li: (props) => <li {...props} className="mb-1" />,
                  code: (props: any) => {
                    const { node, inline, className, children, ...restProps } =
                      props;
                    return !inline ? (
                      <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
                        <code className={className} {...restProps}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code
                        className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                        {...restProps}
                      >
                        {children}
                      </code>
                    );
                  },
                  blockquote: (props) => (
                    <blockquote
                      {...props}
                      className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4"
                    />
                  ),
                  a: (props) => (
                    <a
                      {...props}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  hr: (props) => (
                    <hr
                      {...props}
                      className="my-6 border-gray-300 dark:border-gray-600"
                    />
                  ),
                  table: (props) => (
                    <div className="overflow-x-auto my-4">
                      <table
                        {...props}
                        className="min-w-full border-collapse border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  ),
                  th: (props) => (
                    <th
                      {...props}
                      className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left"
                    />
                  ),
                  td: (props) => (
                    <td
                      {...props}
                      className="border border-gray-300 dark:border-gray-600 px-4 py-2"
                    />
                  ),
                }}
              >
                {content || "*No content yet*"}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
