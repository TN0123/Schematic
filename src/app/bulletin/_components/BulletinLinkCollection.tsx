"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Trash2,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";

interface LinkPreview {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

interface BulletinLinkCollectionProps {
  id: string;
  initialTitle: string;
  initialLinks?: LinkPreview[];
  onSave: (
    id: string,
    updates: {
      title?: string;
      content?: string;
      data?: { links: LinkPreview[] };
    }
  ) => Promise<void>;
  onDelete?: () => void;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export default function BulletinLinkCollection({
  id,
  initialTitle,
  initialLinks = [],
  onSave,
  onDelete,
}: BulletinLinkCollectionProps) {
  const [title, setTitle] = useState(initialTitle);
  const [links, setLinks] = useState<LinkPreview[]>(initialLinks);
  const [newLink, setNewLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedState = useRef({
    title: initialTitle,
    links: initialLinks,
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates: { title?: string; data?: { links: LinkPreview[] } } = {};
      if (title !== lastSavedState.current.title) updates.title = title;
      if (
        JSON.stringify(links) !== JSON.stringify(lastSavedState.current.links)
      ) {
        updates.data = { links };
      }

      if (Object.keys(updates).length > 0) {
        await onSave(id, updates);
        lastSavedState.current = {
          title,
          links,
        };
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }, [id, onSave, title, links]);

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        handleSave();
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

  const handleAddLink = async () => {
    if (!newLink.trim()) return;

    const normalizedUrl = normalizeUrl(newLink.trim());

    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    if (links.some((link) => link.url === normalizedUrl)) {
      setError("This URL has already been added");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newLinkPreview: LinkPreview = {
        id: Date.now().toString(),
        url: normalizedUrl,
        title: normalizedUrl,
      };

      const updatedLinks = [...links, newLinkPreview];
      setLinks(updatedLinks);
      setNewLink("");
      setHasUnsavedChanges(true);
      await handleSave();
    } catch (error) {
      console.error("Failed to add link:", error);
      setError("Failed to add link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    const updatedLinks = links.filter((link) => link.id !== linkId);
    setLinks(updatedLinks);
    setHasUnsavedChanges(true);
    await handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  };

  return (
    <div className="border w-full h-full dark:bg-dark-background dark:border-dark-divider transition-all">
      <div className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="font-semibold text-lg w-full focus:outline-none focus:ring-2 focus:ring-light-accent rounded-lg p-2 mb-2 text-center dark:text-dark-textPrimary dark:focus:ring-dark-accent"
            placeholder="Link Collection Title"
          />
          <div className="flex gap-2">
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
              aria-label="Delete list"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={newLink}
              onChange={(e) => {
                setNewLink(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter a URL..."
              className={`flex-1 p-2 rounded-lg border dark:border-dark-divider dark:bg-dark-editorBackground dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent ${
                error ? "border-red-500 dark:border-red-500" : ""
              }`}
            />
            <button
              onClick={handleAddLink}
              disabled={isLoading}
              className="p-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LinkIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
          {links.map((link) => (
            <div
              key={link.id}
              className="border dark:border-dark-divider rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium dark:text-dark-textPrimary">
                  {link.title}
                </h3>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
              {link.imageUrl && (
                <img
                  src={link.imageUrl}
                  alt={link.title}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              {link.description && (
                <p className="text-sm text-gray-600 dark:text-dark-textSecondary">
                  {link.description}
                </p>
              )}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-light-accent dark:text-dark-accent hover:underline mt-2 inline-block"
              >
                {link.url}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
