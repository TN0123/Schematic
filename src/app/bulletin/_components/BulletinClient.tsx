"use client";
import { useEffect, useState, JSX } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import BulletinNote from "./BulletinNote";
import BulletinTodo from "./BulletinTodo";
import BulletinLinkCollection, { LinkPreview } from "./BulletinLinkCollection";
import BulletinKanban from "./BulletinKanban";
import BulletinDynamic, { DynamicSchema } from "./BulletinDynamic";
import DynamicNoteCreator from "./DynamicNoteCreator";
import { KanbanCard, KanbanColumn } from "./kanban";
import { useSession } from "next-auth/react";
import {
  Plus,
  Loader2,
  ClipboardList,
  NotepadText,
  Logs,
  PanelRightClose,
  PanelRightOpen,
  Link,
  Columns,
  Search,
  Sparkles,
  Trash2,
  X,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import UsageIndicator from "@/components/UsageIndicator";
import UpgradePrompt from "@/components/UpgradePrompt";

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
}

interface QueueItem {
  id: string;
  text: string;
  priority: number;
}

type BulletinItem = {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
} & (
  | { type: "text"; data?: undefined }
  | { type: "todo"; data: { items: TodoItem[] } }
  | { type: "priority-queue"; data: { items: QueueItem[] } }
  | { type: "link-collection"; data: { links: LinkPreview[] } }
  | { type: "kanban"; data: { columns: KanbanColumn[]; cards: KanbanCard[] } }
  | { type: "dynamic"; data: Record<string, any>; schema: DynamicSchema }
);

// Confirmation Modal Component
function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemTitle: string;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-dark-background rounded-lg shadow-xl max-w-md w-full p-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
                Delete Note
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-gray-700 dark:text-dark-textPrimary mb-6">
            Are you sure you want to delete{" "}
            <span className="font-medium">"{itemTitle || "Untitled"}"</span>?
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-700 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-hover rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function BulletinClient() {
  const [items, setItems] = useState<BulletinItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [showDynamicCreator, setShowDynamicCreator] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BulletinItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Add scroll lock effect
  useEffect(() => {
    if (isSidebarOpen) {
      // Prevent scrolling on the body when sidebar is open
      document.body.style.overflow = "hidden";
    } else {
      // Restore scrolling when sidebar is closed
      document.body.style.overflow = "unset";
    }

    // Cleanup function to ensure scrolling is restored when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  // Ensure portal renders only on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const typeIcons: Record<string, JSX.Element> = {
    text: (
      <NotepadText className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
    todo: (
      <ClipboardList className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
    "priority-queue": (
      <Logs className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
    "link-collection": (
      <Link className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
    kanban: <Columns className="w-4 h-4 text-light-icon dark:text-dark-icon" />,
    dynamic: (
      <Sparkles className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
  };

  useEffect(() => {
    if (!hasFetched && userId) {
      fetchBulletins();
    }
  }, [hasFetched, userId]);

  useEffect(() => {
    const noteId = searchParams.get("noteId");
    setExpandedItemId(noteId);
  }, [searchParams]);

  useEffect(() => {
    if (loading) return;

    if (items.length === 0) {
      if (searchParams.get("noteId")) {
        router.replace(pathname);
      }
      return;
    }

    const noteId = searchParams.get("noteId");
    const noteExists = noteId && items.some((item) => item.id === noteId);

    if (!noteExists) {
      router.replace(`${pathname}?noteId=${items[0].id}`);
    }
  }, [items, loading, searchParams, pathname, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const dropdownContainer = document.querySelector(
        ".relative.inline-block"
      );
      if (dropdownContainer && !dropdownContainer.contains(target)) {
        setShowDropdown(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchBulletins = async () => {
    setLoading(true);
    const response = await fetch("/api/bulletins");
    const data = await response.json();
    setItems(data);
    setLoading(false);
    setHasFetched(true);
  };

  const saveItem = async (
    id: string,
    updates: {
      title?: string;
      content?: string;
      data?: { links?: LinkPreview[] } | Record<string, any>;
      schema?: DynamicSchema;
    }
  ) => {
    // Add item to saving set
    setSavingItems((prev) => new Set([...prev, id]));

    // Update local state immediately with current timestamp for real-time sorting
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, updatedAt: new Date() };
          if (updates.title !== undefined) updatedItem.title = updates.title;
          if (updates.content !== undefined)
            updatedItem.content = updates.content;
          if (updates.data !== undefined) {
            // Type-safe assignment for data
            (updatedItem as any).data = updates.data;
          }
          if (updates.schema !== undefined && "schema" in updatedItem) {
            (updatedItem as any).schema = updates.schema;
          }
          return updatedItem;
        }
        return item;
      })
    );

    try {
      const response = await fetch(`/api/bulletins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedItem = await response.json();
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === id ? { ...item, ...updatedItem } : item
        )
      );
    } catch (error) {
      console.error("Failed to save item:", error);
      // You could add a toast notification here for better UX
    } finally {
      // Remove item from saving set
      setSavingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteRequest = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item) {
      setItemToDelete(item);
      setShowDeleteConfirmation(true);
    }
  };

  const deleteItem = async (id: string) => {
    setIsDeleting(true);

    try {
      const newItems = items.filter((item) => item.id !== id);
      setItems(newItems);

      if (expandedItemId === id) {
        if (newItems.length > 0) {
          const newExpandedId = newItems[0].id;
          setExpandedItemId(newExpandedId);
          router.replace(`${pathname}?noteId=${newExpandedId}`);
        } else {
          setExpandedItemId(null);
          router.replace(pathname);
        }
      }

      await fetch(`/api/bulletins/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
      // Optionally, you could revert the UI state here and show an error message
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
    }
  };

  const addItem = async (type = "text") => {
    const response = await fetch("/api/bulletins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Note",
        content: "",
        type,
        data:
          type === "todo"
            ? { items: [] as TodoItem[] }
            : type === "link-collection"
            ? { links: [] as LinkPreview[] }
            : type === "kanban"
            ? {
                columns: [
                  { id: "backlog", title: "Backlog" },
                  { id: "todo", title: "To Do" },
                  { id: "in-progress", title: "In Progress" },
                  { id: "done", title: "Done" },
                ] as KanbanColumn[],
                cards: [] as KanbanCard[],
              }
            : undefined,
      }),
    });

    if (response.status === 403) {
      // Note limit reached
      setShowUpgradePrompt(true);
      setShowDropdown(false);
      return;
    }

    const newBulletin = await response.json();
    setItems([newBulletin, ...items]);
    setExpandedItemId(newBulletin.id);
    router.push(`${pathname}?noteId=${newBulletin.id}`);
  };

  const createDynamicNote = async (title: string, schema: DynamicSchema) => {
    const response = await fetch("/api/bulletins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: "",
        type: "dynamic",
        data: {},
        schema,
      }),
    });

    if (response.status === 403) {
      // Note limit reached
      setShowUpgradePrompt(true);
      setShowDynamicCreator(false);
      return;
    }

    const newBulletin = await response.json();
    setItems([newBulletin, ...items]);
    setExpandedItemId(newBulletin.id);
    router.push(`${pathname}?noteId=${newBulletin.id}`);
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]+>/g, " ");
  };

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row dark:from-dark-primary dark:to-dark-secondary transition-all">
      {/* Mobile button */}
      {isMounted &&
        createPortal(
          <button
            className={`md:hidden fixed bottom-24 right-6 z-50 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform ${
              isSidebarOpen
                ? "scale-0 opacity-0 pointer-events-none"
                : "scale-100 opacity-100"
            }`}
            onClick={() => setIsSidebarOpen(true)}
          >
            <ChevronUp className="w-6 h-6" />
          </button>,
          document.body
        )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <AnimatePresence>
            {loading && (
              <motion.div
                className="absolute inset-0 flex flex-col justify-center items-center bg-gradient-to-b from-light-secondary to-light-tertiary bg-opacity-90 dark:from-dark-primary dark:to-dark-secondary"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <Loader2
                  className="animate-spin text-light-icon dark:text-dark-textSecondary"
                  size={48}
                />
                <p className="mt-4 text-light-heading font-medium text-lg dark:text-dark-textSecondary">
                  Loading notes...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <>
            {items.map((item) => {
              if (item.id !== expandedItemId) return null;

              switch (item.type) {
                case "todo":
                  return (
                    <BulletinTodo
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      data={item.data}
                      updatedAt={item.updatedAt}
                      onSave={saveItem}
                      onDelete={() => handleDeleteRequest(item.id)}
                      isSaving={savingItems.has(item.id)}
                    />
                  );
                case "kanban":
                  return (
                    <BulletinKanban
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      data={item.data}
                      updatedAt={item.updatedAt}
                      onSave={saveItem}
                      onDelete={() => handleDeleteRequest(item.id)}
                      isSaving={savingItems.has(item.id)}
                    />
                  );
                case "link-collection":
                  return (
                    <BulletinLinkCollection
                      key={item.id}
                      id={item.id}
                      initialTitle={item.title}
                      initialLinks={item.data?.links}
                      onSave={saveItem}
                      onDelete={() => handleDeleteRequest(item.id)}
                    />
                  );
                case "dynamic":
                  return (
                    <BulletinDynamic
                      key={item.id}
                      id={item.id}
                      initialTitle={item.title}
                      initialSchema={item.schema}
                      initialData={item.data}
                      updatedAt={item.updatedAt}
                      onSave={saveItem}
                      onDelete={() => handleDeleteRequest(item.id)}
                      isSaving={savingItems.has(item.id)}
                    />
                  );
                case "text":
                default:
                  return (
                    <BulletinNote
                      key={item.id}
                      id={item.id}
                      initialTitle={item.title}
                      initialContent={item.content}
                      updatedAt={item.updatedAt}
                      onSave={saveItem}
                      onDelete={() => handleDeleteRequest(item.id)}
                      isSaving={savingItems.has(item.id)}
                    />
                  );
              }
            })}

            {expandedItemId === null && (
              <div className="flex flex-col items-center justify-center w-full h-full bg-light-primary border border-light-border shadow-inner dark:bg-dark-secondary dark:border-dark-divider">
                <p className="text-light-heading text-lg font-medium dark:text-dark-textPrimary">
                  No note selected
                </p>
                <p className="text-light-subtle text-sm mt-2 dark:text-dark-textSecondary">
                  Tap on a note from the sidebar or create a new note
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:static z-50 h-full bg-white dark:bg-dark-background dark:text-dark-textPrimary md:border-l md:border-light-border dark:md:border-dark-divider transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:w-14" : "md:w-80"
        } flex-col`}
      >
        <div className="p-4">
          {/* Desktop header */}
          <div
            className={`flex ${
              isCollapsed ? "flex-col" : ""
            } justify-between items-center mb-4`}
          >
            <span className="text-lg flex items-center gap-2 font-semibold text-light-heading dark:text-dark-textPrimary">
              <button
                onClick={handleToggle}
                className="p-2 hidden md:block rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
              >
                {isCollapsed ? (
                  <PanelRightOpen
                    size={24}
                    className="text-gray-700 dark:text-dark-textSecondary"
                  />
                ) : (
                  <PanelRightClose
                    size={24}
                    className="text-gray-700 dark:text-dark-textSecondary"
                  />
                )}
              </button>
              {!isCollapsed && <span>All Notes</span>}
            </span>
            <div className="relative inline-block text-left">
              {!isCollapsed ? (
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-md hover:from-green-500 hover:to-green-600 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:shadow-none dark:bg-dark-secondary dark:hover:bg-dark-actionHover dark:focus:ring-dark-divider"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown((prev) => !prev);
                  }}
                >
                  <Plus size={16} className="stroke-current" />
                  <span className="hidden md:inline">New Note</span>
                </button>
              ) : (
                <button
                  className="p-2 mt-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white hover:bg-gray-100 dark:hover:bg-dark-hover"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown((prev) => !prev);
                  }}
                >
                  <Plus size={16} className="stroke-current" />
                </button>
              )}

              {/* Dropdown */}
              {showDropdown && (
                <>
                  {isCollapsed ? (
                    <div className="absolute z-10 mt-2 w-8 origin-top-left rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 dark:bg-dark-background">
                      <div>
                        <button
                          onClick={() => {
                            addItem("text");
                            setShowDropdown(false);
                          }}
                          className="flex justify-center w-full py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                          title="Text Note"
                        >
                          <NotepadText />
                        </button>
                        <button
                          onClick={() => {
                            addItem("todo");
                            setShowDropdown(false);
                          }}
                          className="flex justify-center w-full py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                          title="To-Do List"
                        >
                          <ClipboardList />
                        </button>
                        <button
                          onClick={() => {
                            addItem("kanban");
                            setShowDropdown(false);
                          }}
                          className="flex justify-center w-full py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                          title="Kanban Board"
                        >
                          <Columns />
                        </button>
                        <button
                          onClick={() => {
                            addItem("link-collection");
                            setShowDropdown(false);
                          }}
                          className="flex justify-center w-full py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover relative"
                          title="Link Collection"
                        >
                          <Link />
                        </button>
                        <button
                          onClick={() => {
                            setShowDynamicCreator(true);
                            setShowDropdown(false);
                          }}
                          className="flex justify-center w-full py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover relative"
                          title="Dynamic Note"
                        >
                          <Sparkles />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 dark:bg-dark-background">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            addItem("text");
                            setShowDropdown(false);
                          }}
                          className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                        >
                          <NotepadText />
                          Text Note
                        </button>
                        <button
                          onClick={() => {
                            addItem("todo");
                            setShowDropdown(false);
                          }}
                          className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                        >
                          <ClipboardList />
                          To-Do List
                        </button>
                        <button
                          onClick={() => {
                            addItem("kanban");
                            setShowDropdown(false);
                          }}
                          className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                        >
                          <Columns />
                          Kanban Board
                        </button>
                        <button
                          onClick={() => {
                            addItem("link-collection");
                            setShowDropdown(false);
                          }}
                          className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover relative"
                        >
                          <Link />
                          Link Collection
                        </button>
                        <button
                          onClick={() => {
                            setShowDynamicCreator(true);
                            setShowDropdown(false);
                          }}
                          className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover relative"
                        >
                          <Sparkles />
                          Dynamic Note
                          <span className="absolute right-0 top-0 text-[9px] bg-green-500/70 text-white px-2 rounded-sm leading-[1.3]">
                            experimental
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {!isCollapsed && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-light-subtle dark:text-dark-textSecondary" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-light-border dark:border-dark-divider bg-white dark:bg-dark-background text-light-heading dark:text-dark-textPrimary placeholder:text-light-subtle dark:placeholder:text-dark-textSecondary focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="space-y-0 px-3 pb-4">
              {items
                .filter((item) =>
                  item.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime()
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className={`cursor-pointer px-3 py-2.5 rounded-md transition-all duration-150 ${
                      item.id === expandedItemId
                        ? "bg-blue-500/10 text-blue-600 dark:bg-neutral-700/50 dark:text-neutral-200"
                        : "hover:bg-gray-100 dark:hover:bg-dark-hover text-light-heading dark:text-dark-textPrimary"
                    }`}
                    onClick={() => {
                      setExpandedItemId(item.id);
                      router.push(`${pathname}?noteId=${item.id}`);
                      setSearchQuery("");
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {typeIcons[item.type] || (
                        <NotepadText
                          className={`w-4 h-4 ${
                            item.id === expandedItemId
                              ? "text-blue-500 dark:text-neutral-300"
                              : "text-light-icon dark:text-dark-icon"
                          }`}
                        />
                      )}
                      <h3
                        className={`font-medium truncate text-sm ${
                          item.id === expandedItemId
                            ? "text-blue-600 dark:text-neutral-200"
                            : "text-light-heading dark:text-dark-textPrimary"
                        }`}
                      >
                        {item.title || "Untitled"}
                      </h3>
                    </div>

                    <p
                      className={`text-xs truncate leading-relaxed ${
                        item.id === expandedItemId
                          ? "text-blue-500/70 dark:text-neutral-400"
                          : "text-light-subtle dark:text-dark-textSecondary"
                      }`}
                    >
                      {stripHtml(item.content) || ""}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Sheet Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="flex-1 bg-black bg-opacity-50"
              onClick={() => setIsSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Bottom Sheet */}
            <motion.div
              className="bg-white dark:bg-dark-background dark:text-dark-textPrimary rounded-t-3xl shadow-2xl flex flex-col max-h-[calc(85vh-5rem)] min-h-[calc(60vh-5rem)] mb-20"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
                duration: 0.3,
              }}
            >
              {/* Top padding */}
              <div className="py-3" />

              {/* Header */}
              <div className="px-6 pb-4 border-b border-gray-200 dark:border-dark-divider">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-light-heading dark:text-dark-textPrimary">
                    All Notes
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown((prev) => !prev);
                      }}
                    >
                      <Plus size={18} className="stroke-current" />
                      <span className="font-medium">New</span>
                    </button>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-subtle dark:text-dark-textSecondary" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-dark-divider bg-gray-50 dark:bg-dark-background text-light-heading dark:text-dark-textPrimary placeholder:text-light-subtle dark:placeholder:text-dark-textSecondary focus:outline-none focus:border-green-500 dark:focus:border-green-400 transition-colors text-base"
                  />
                </div>

                {/* Usage Indicator */}
                <div className="mb-4">
                  <UsageIndicator type="bulletins" />
                </div>

                {/* Mobile Dropdown */}
                {showDropdown && (
                  <motion.div
                    className="absolute left-6 right-6 top-20 z-10 mt-2 rounded-2xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 dark:bg-dark-background border border-gray-200 dark:border-dark-divider"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="py-2">
                      <button
                        onClick={() => {
                          addItem("text");
                          setShowDropdown(false);
                        }}
                        className="flex gap-3 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 dark:text-dark-textPrimary dark:hover:bg-dark-hover transition-colors active:bg-gray-100 dark:active:bg-dark-actionHover"
                      >
                        <NotepadText className="w-5 h-5" />
                        <span className="font-medium">Text Note</span>
                      </button>
                      <button
                        onClick={() => {
                          addItem("todo");
                          setShowDropdown(false);
                        }}
                        className="flex gap-3 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 dark:text-dark-textPrimary dark:hover:bg-dark-hover transition-colors active:bg-gray-100 dark:active:bg-dark-actionHover"
                      >
                        <ClipboardList className="w-5 h-5" />
                        <span className="font-medium">To-Do List</span>
                      </button>
                      <button
                        onClick={() => {
                          addItem("kanban");
                          setShowDropdown(false);
                        }}
                        className="flex gap-3 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 dark:text-dark-textPrimary dark:hover:bg-dark-hover transition-colors active:bg-gray-100 dark:active:bg-dark-actionHover"
                      >
                        <Columns className="w-5 h-5" />
                        <span className="font-medium">Kanban Board</span>
                      </button>
                      <button
                        onClick={() => {
                          addItem("link-collection");
                          setShowDropdown(false);
                        }}
                        className="flex gap-3 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 dark:text-dark-textPrimary dark:hover:bg-dark-hover transition-colors active:bg-gray-100 dark:active:bg-dark-actionHover"
                      >
                        <Link className="w-5 h-5" />
                        <span className="font-medium">Link Collection</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDynamicCreator(true);
                          setShowDropdown(false);
                        }}
                        className="flex gap-3 w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 dark:text-dark-textPrimary dark:hover:bg-dark-hover transition-colors active:bg-gray-100 dark:active:bg-dark-actionHover relative"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span className="font-medium">Dynamic Note</span>
                        <span className="absolute right-4 top-1 text-[10px] bg-green-500/80 text-white px-2 py-0.5 rounded-md leading-none font-medium">
                          experimental
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3 pb-6">
                  {items
                    .filter((item) =>
                      item.title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .sort(
                      (a, b) =>
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime()
                    )
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        className={`cursor-pointer p-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                          item.id === expandedItemId
                            ? "bg-green-50 border-2 border-green-200 dark:bg-green-900/20 dark:border-green-700/50"
                            : "bg-gray-50 hover:bg-gray-100 dark:bg-dark-hover dark:hover:bg-dark-actionHover border-2 border-transparent"
                        }`}
                        onClick={() => {
                          setExpandedItemId(item.id);
                          router.push(`${pathname}?noteId=${item.id}`);
                          setSearchQuery("");
                          setIsSidebarOpen(false);
                        }}
                        whileTap={{ scale: 0.98 }}
                        layout
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {(() => {
                            const iconClass = `w-5 h-5 ${
                              item.id === expandedItemId
                                ? "text-green-600 dark:text-green-400"
                                : "text-light-icon dark:text-dark-icon"
                            }`;

                            switch (item.type) {
                              case "text":
                                return <NotepadText className={iconClass} />;
                              case "todo":
                                return <ClipboardList className={iconClass} />;
                              case "priority-queue":
                                return <Logs className={iconClass} />;
                              case "link-collection":
                                return <Link className={iconClass} />;
                              case "kanban":
                                return <Columns className={iconClass} />;
                              case "dynamic":
                                return <Sparkles className={iconClass} />;
                              default:
                                return <NotepadText className={iconClass} />;
                            }
                          })()}
                          <h3
                            className={`font-semibold truncate text-base ${
                              item.id === expandedItemId
                                ? "text-green-700 dark:text-green-300"
                                : "text-light-heading dark:text-dark-textPrimary"
                            }`}
                          >
                            {item.title || "Untitled"}
                          </h3>
                        </div>

                        <p
                          className={`text-sm line-clamp-2 leading-relaxed ${
                            item.id === expandedItemId
                              ? "text-green-600/80 dark:text-green-400/80"
                              : "text-light-subtle dark:text-dark-textSecondary"
                          }`}
                        >
                          {stripHtml(item.content) || "No content"}
                        </p>

                        <div className="flex justify-between items-center mt-3">
                          <span
                            className={`text-xs ${
                              item.id === expandedItemId
                                ? "text-green-500/70 dark:text-green-400/70"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                          {item.id === expandedItemId && (
                            <motion.div
                              className="w-2 h-2 bg-green-500 rounded-full"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1 }}
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Note Creator Modal */}
      <DynamicNoteCreator
        isOpen={showDynamicCreator}
        onClose={() => setShowDynamicCreator(false)}
        onCreateNote={createDynamicNote}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteConfirmation(false);
            setItemToDelete(null);
          }
        }}
        onConfirm={() => itemToDelete && deleteItem(itemToDelete.id)}
        itemTitle={itemToDelete?.title || ""}
        isDeleting={isDeleting}
      />

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <UpgradePrompt
          type="bulletins"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
