"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Trash2,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Save,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface LinkPreview {
  id: string;
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: string;
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

function SortableLinkCard({
  link,
  onDelete,
}: {
  link: LinkPreview;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border dark:border-dark-divider rounded-lg p-4 hover:shadow-lg transition-shadow bg-white dark:bg-dark-secondary"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab">
            <GripVertical className="h-4 w-4 text-gray-400 dark:text-dark-icon" />
          </div>
          <h3 className="font-medium dark:text-dark-textPrimary truncate max-w-[80%]">
            {link.title}
          </h3>
        </div>
        <button
          onClick={() => onDelete(link.id)}
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
        <p className="text-sm text-gray-600 dark:text-dark-textSecondary line-clamp-3">
          {link.description}
        </p>
      )}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-light-accent dark:text-dark-accent hover:underline mt-2 inline-block truncate block w-full"
      >
        {link.url}
      </a>
    </div>
  );
}

function LinkCard({ link }: { link: LinkPreview }) {
  return (
    <div className="border dark:border-dark-divider rounded-lg p-4 shadow-lg bg-white dark:bg-dark-secondary">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="cursor-grab">
            <GripVertical className="h-4 w-4 text-gray-400 dark:text-dark-icon" />
          </div>
          <h3 className="font-medium dark:text-dark-textPrimary truncate max-w-[80%]">
            {link.title}
          </h3>
        </div>
      </div>
      {link.imageUrl && (
        <img
          src={link.imageUrl}
          alt={link.title}
          className="w-full h-32 object-cover rounded mb-2"
        />
      )}
      {link.description && (
        <p className="text-sm text-gray-600 dark:text-dark-textSecondary line-clamp-3">
          {link.description}
        </p>
      )}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-light-accent dark:text-dark-accent hover:underline mt-2 inline-block truncate block w-full"
      >
        {link.url}
      </a>
    </div>
  );
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
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryNameEdits, setCategoryNameEdits] = useState<
    Record<string, string>
  >({});

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeLink = activeId
    ? links.find((link) => link.id === activeId)
    : null;

  const sensors = useSensors(useSensor(PointerSensor));

  const handleRenameCategory = (oldCategory: string, newCategory: string) => {
    if (!newCategory.trim() || oldCategory === newCategory) return;

    const updatedLinks = links.map((link) =>
      link.category === oldCategory ? { ...link, category: newCategory } : link
    );

    setLinks(updatedLinks);
    setEditingCategory(null);
    setCategoryNameEdits((prev) => {
      const copy = { ...prev };
      delete copy[oldCategory];
      return copy;
    });

    setHasUnsavedChanges(true);
    handleSaveWithLinks(updatedLinks);
  };

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

  const handleSaveWithLinks = useCallback(
    async (customLinks: LinkPreview[]) => {
      setIsSaving(true);
      try {
        const updates: { title?: string; data?: { links: LinkPreview[] } } = {};
        if (title !== lastSavedState.current.title) updates.title = title;
        if (
          JSON.stringify(customLinks) !==
          JSON.stringify(lastSavedState.current.links)
        ) {
          updates.data = { links: customLinks };
        }

        if (Object.keys(updates).length > 0) {
          await onSave(id, updates);
          lastSavedState.current = {
            title,
            links: customLinks,
          };
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error("Failed to save:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [id, onSave, title]
  );

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
        category: "Uncategorized",
      };

      const categories = Array.from(
        new Set(links.map((link) => link.category))
      );

      const response = await fetch("/api/categorize-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categories,
          link: newLinkPreview,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to categorize link");
      }

      const { result } = await response.json();

      newLinkPreview.category = result;

      const updatedLinks = [...links, newLinkPreview];
      setLinks(updatedLinks);
      setNewLink("");
      setHasUnsavedChanges(true);
      await handleSaveWithLinks(updatedLinks); // ✅ Use custom save
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
    await handleSaveWithLinks(updatedLinks); // ✅ Use custom save
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLink();
    }
  };

  const linksByCategory = links.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, LinkPreview[]>);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeLink = links.find((link) => link.id === active.id);
    const overLink = links.find((link) => link.id === over.id);

    if (!activeLink || !overLink) return;

    // If the links are in different categories, update the category
    if (activeLink.category !== overLink.category) {
      const updatedLinks = links.map((link) =>
        link.id === active.id ? { ...link, category: overLink.category } : link
      );
      setLinks(updatedLinks);
      setHasUnsavedChanges(true);
      handleSaveWithLinks(updatedLinks);
    } else {
      // If in the same category, reorder the links
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over.id);
      const updatedLinks = arrayMove(links, oldIndex, newIndex);
      setLinks(updatedLinks);
      setHasUnsavedChanges(true);
      handleSaveWithLinks(updatedLinks);
    }
  };

  return (
    <div className="w-full h-full dark:bg-dark-background transition-all">
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

        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {Object.entries(linksByCategory).map(
              ([category, categoryLinks]) => (
                <div key={category} className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    {editingCategory === category ? (
                      <>
                        <input
                          type="text"
                          value={categoryNameEdits[category] ?? category}
                          onChange={(e) =>
                            setCategoryNameEdits((prev) => ({
                              ...prev,
                              [category]: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const newCategory =
                              categoryNameEdits[category]?.trim();
                            if (newCategory) {
                              handleRenameCategory(category, newCategory);
                            } else {
                              setEditingCategory(null);
                              setCategoryNameEdits((prev) => {
                                const copy = { ...prev };
                                delete copy[category];
                                return copy;
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newCategory =
                                categoryNameEdits[category]?.trim();
                              if (newCategory) {
                                handleRenameCategory(category, newCategory);
                              } else {
                                setEditingCategory(null);
                                setCategoryNameEdits((prev) => {
                                  const copy = { ...prev };
                                  delete copy[category];
                                  return copy;
                                });
                              }
                            } else if (e.key === "Escape") {
                              setEditingCategory(null);
                              setCategoryNameEdits((prev) => {
                                const copy = { ...prev };
                                delete copy[category];
                                return copy;
                              });
                            }
                          }}
                          autoFocus
                          className="text-xl font-semibold dark:text-dark-textPrimary bg-transparent border-b border-gray-400 focus:outline-none"
                        />
                      </>
                    ) : (
                      <>
                        <h2
                          className="text-xl font-semibold dark:text-dark-textPrimary cursor-pointer"
                          onClick={() => setEditingCategory(category)}
                          title="Click to edit category name"
                        >
                          {category}
                        </h2>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SortableContext
                      items={categoryLinks.map((link) => link.id)}
                      strategy={rectSortingStrategy}
                    >
                      {categoryLinks.map((link) => (
                        <SortableLinkCard
                          key={link.id}
                          link={link}
                          onDelete={handleDeleteLink}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              )
            )}
            <DragOverlay>
              {activeLink ? <LinkCard link={activeLink} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
