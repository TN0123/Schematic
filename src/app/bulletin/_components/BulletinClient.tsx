"use client";
import { useEffect, useState, JSX } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import BulletinNote from "./BulletinNote";
import BulletinTodo from "./BulletinTodo";
import BulletinLinkCollection, { LinkPreview } from "./BulletinLinkCollection";
import BulletinKanban from "./BulletinKanban";
import BulletinDynamic, { DynamicSchema } from "./BulletinDynamic";
import DynamicNoteCreator from "./DynamicNoteCreator";
import { useSession } from "next-auth/react";
import {
  Plus,
  Loader2,
  ClipboardList,
  NotepadText,
  Logs,
  PanelLeftClose,
  PanelLeftOpen,
  Link,
  Columns,
  Search,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

interface KanbanCard {
  id: string;
  text: string;
  columnId: string;
}

interface KanbanColumn {
  id: string;
  title: string;
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
    dynamic: <Sparkles className="w-4 h-4 text-purple-500" />,
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
    }
  ) => {
    // Add item to saving set
    setSavingItems((prev) => new Set([...prev, id]));

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
      setItems(
        items.map((item) =>
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
                ],
                cards: [],
              }
            : undefined,
      }),
    });

    const newBulletin = await response.json();
    setItems([...items, newBulletin]);
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

    const newBulletin = await response.json();
    setItems([...items, newBulletin]);
    setExpandedItemId(newBulletin.id);
    router.push(`${pathname}?noteId=${newBulletin.id}`);
  };

  const deleteItem = async (id: string) => {
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
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]+>/g, " ");
  };

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row dark:from-dark-primary dark:to-dark-secondary transition-all">
      {/* Sidebar */}
      <aside
        className={`fixed md:static z-50 top-0 left-16 md:left-0 h-full bg-white dark:bg-dark-background dark:text-dark-textPrimary md:border-r md:border-light-border dark:md:border-dark-divider transform transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          isCollapsed ? "md:w-14" : "md:w-1/4"
        } w-[calc(100%-4rem)] flex flex-col`}
      >
        <div className="p-4">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between mb-6 pt-4">
            <h2 className="text-xl font-semibold text-light-heading dark:text-dark-textPrimary">
              All Notes
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-hover"
            >
              <PanelLeftClose className="w-6 h-6" />
            </button>
          </div>

          {/* Desktop header */}
          <div
            className={`hidden md:flex ${
              isCollapsed ? "flex-col" : ""
            } justify-between items-center mb-4`}
          >
            <span className="text-lg flex items-center gap-2 font-semibold text-light-heading dark:text-dark-textPrimary">
              <button
                onClick={handleToggle}
                className="p-2 hidden md:block rounded-full hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-all duration-200"
              >
                {isCollapsed ? (
                  <PanelLeftOpen
                    size={24}
                    className="text-gray-700 dark:text-dark-textSecondary"
                  />
                ) : (
                  <PanelLeftClose
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
                    <div className="absolute left-2 z-10 mt-2 w-8 origin-top-left rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 dark:bg-dark-background">
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
                          <span className="absolute right-1 top-1 text-[8px] bg-green-500/70 text-white px-1 rounded-sm leading-[1.3]">
                            new
                          </span>
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
                          <span className="absolute right-1 top-1 text-[8px] bg-purple-500/70 text-white px-1 rounded-sm leading-[1.3]">
                            AI
                          </span>
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
                          <span className="absolute right-0 top-0 text-[10px] bg-green-500/70 text-white px-2 rounded-sm leading-[1.3]">
                            new
                          </span>
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
                          <span className="absolute right-0 top-0 text-[10px] bg-purple-500/70 text-white px-2 rounded-sm leading-[1.3]">
                            AI
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
            <div className="space-y-3 p-4">
              {items
                .filter((item) =>
                  item.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className={`cursor-pointer p-3 rounded-lg hover:shadow-md transition-all duration-200 ${
                      item.id === expandedItemId
                        ? "bg-blue-50 border-2 border-blue-200 dark:bg-dark-secondary dark:border-dark-divider"
                        : "hover:bg-light-hover border-2 border-light-border dark:hover:bg-dark-actionHover dark:border-dark-divider"
                    }`}
                    onClick={() => {
                      setExpandedItemId(item.id);
                      router.push(`${pathname}?noteId=${item.id}`);
                      // Close sidebar on mobile after selection
                      if (window.innerWidth < 768) {
                        // 768px is the md breakpoint
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {typeIcons[item.type] || (
                        <NotepadText className="w-4 h-4 text-light-icon dark:text-dark-icon" />
                      )}
                      <h3 className="font-semibold truncate text-light-heading dark:text-dark-textPrimary">
                        {item.title || "Untitled"}
                      </h3>
                    </div>

                    <p className="text-sm text-light-subtle truncate mt-1 dark:text-dark-textSecondary">
                      {stripHtml(item.content) || ""}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden left-16"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <button
        className={`md:hidden fixed top-4 left-20 z-40 bg-white dark:bg-dark-background dark:text-white p-3 rounded-full shadow-lg ${
          isSidebarOpen ? "hidden" : "block"
        }`}
        onClick={() => setIsSidebarOpen(true)}
      >
        <PanelLeftOpen className="w-6 h-6" />
      </button>
      {/* Main content */}
      <div className="w-full md:w-3/4 flex-1">
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
                      onDelete={() => {
                        deleteItem(item.id);
                      }}
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
                      onDelete={() => {
                        deleteItem(item.id);
                      }}
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
                      onDelete={() => {
                        deleteItem(item.id);
                      }}
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
                      onDelete={() => {
                        deleteItem(item.id);
                      }}
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
                      onDelete={() => {
                        deleteItem(item.id);
                      }}
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

      {/* Dynamic Note Creator Modal */}
      <DynamicNoteCreator
        isOpen={showDynamicCreator}
        onClose={() => setShowDynamicCreator(false)}
        onCreateNote={createDynamicNote}
      />
    </div>
  );
}
