"use client";
import { useEffect, useState, JSX } from "react";
import BulletinNote from "./_components/BulletinNote";
import BulletinTodo from "./_components/BulletinTodo";
import BulletinPriorityQueue from "./_components/BulletinPriorityQueue";
import { useSession } from "next-auth/react";
import {
  Plus,
  Loader2,
  ListTodo,
  NotepadText,
  Logs,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulletinItem {
  id: string;
  title: string;
  content: string;
  type: string;
  data?: any;
}

export default function Bulletin() {
  const [items, setItems] = useState<BulletinItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const typeIcons: Record<string, JSX.Element> = {
    text: (
      <NotepadText className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
    todo: <ListTodo className="w-4 h-4 text-light-icon dark:text-dark-icon" />,
    "priority-queue": (
      <Logs className="w-4 h-4 text-light-icon dark:text-dark-icon" />
    ),
  };

  useEffect(() => {
    if (!hasFetched && userId) {
      fetchBulletins();
    }
  }, [hasFetched, userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".relative.inline-block")) {
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
    setExpandedItemId(data.length > 0 ? data[0].id : null);
    setLoading(false);
  };

  const saveItem = async (
    id: string,
    updates: { title?: string; content?: string }
  ) => {
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
            ? { items: [] }
            : type === "priority-queue"
            ? { items: [] }
            : {},
      }),
    });

    const newBulletin = await response.json();
    setItems([...items, newBulletin]);
    setExpandedItemId(newBulletin.id);
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/bulletins/${id}`, {
      method: "DELETE",
    });

    setItems(items.filter((item) => item.id !== id));
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]+>/g, " ");
  };

  return (
    <div className="h-[90dvh] flex flex-col md:flex-row dark:from-dark-primary dark:to-dark-secondary transition-all">
      {/* Sidebar */}
      <aside
        className={`fixed md:static z-10 top-20 left-0 h-full w-3/4 md:w-1/4 bg-white overflow-y-scroll p-4 dark:bg-dark-background dark:text-dark-textPrimary md:border-r md:border-light-border dark:md:border-dark-divider transform transition-transform duration-300 shadow-lg md:shadow-none ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-light-heading dark:text-dark-textPrimary">
            All Notes
          </h2>
          <div className="relative inline-block text-left">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg shadow-md hover:from-green-500 hover:to-green-600 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:shadow-none dark:bg-dark-secondary dark:hover:bg-dark-actionHover dark:focus:ring-dark-divider"
              onClick={() => setShowDropdown((prev) => !prev)}
            >
              <Plus size={16} className="stroke-current" />
              <span className="hidden md:inline">New Note</span>
            </button>
            {/* Dropdown */}
            {showDropdown && (
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
                    <ListTodo />
                    To-Do List
                  </button>
                  <button
                    onClick={() => {
                      addItem("priority-queue");
                      setShowDropdown(false);
                    }}
                    className="flex gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-dark-textPrimary dark:hover:bg-dark-hover"
                  >
                    <Logs />
                    Priority Queue
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`cursor-pointer p-3 rounded-lg hover:shadow-md transition-all duration-200 ${
                item.id === expandedItemId
                  ? "bg-blue-50 border-2 border-blue-200 dark:bg-dark-secondary dark:border-dark-divider"
                  : "hover:bg-light-hover border-2 border-light-border dark:hover:bg-dark-actionHover dark:border-dark-divider"
              }`}
              onClick={() => setExpandedItemId(item.id)}
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
                {stripHtml(item.content) || "No content"}
              </p>
            </div>
          ))}
        </div>
      </aside>
      <button
        className={`md:hidden fixed top-20 bg-white dark:bg-dark-background dark:text-white p-3 rounded-lg ${
          isSidebarOpen ? "right-4" : "left-4"
        }`}
        onClick={() => setIsSidebarOpen((prev) => !prev)}
      >
        {isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
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
                      onSave={saveItem}
                      onDelete={() => {
                        deleteItem(item.id);
                        setExpandedItemId(null);
                      }}
                    />
                  );
                case "priority-queue":
                  return (
                    <BulletinPriorityQueue
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      data={item.data}
                      onSave={saveItem}
                      onDelete={() => {
                        deleteItem(item.id);
                        setExpandedItemId(null);
                      }}
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
                      onSave={saveItem}
                      onDelete={() => {
                        deleteItem(item.id);
                        setExpandedItemId(null);
                      }}
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
    </div>
  );
}
