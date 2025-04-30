"use client";
import { useEffect, useState } from "react";
import BulletinItem from "./_components/BulletinItem";
import { useSession } from "next-auth/react";
import { Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulletinItem {
  id: string;
  title: string;
  content: string;
}

export default function Bulletin() {
  const [items, setItems] = useState<BulletinItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!hasFetched && userId) {
      fetchBulletins();
    }
  }, [hasFetched, userId]);

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

  const addItem = async () => {
    const response = await fetch("/api/bulletins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Note",
        content: "",
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
    <div className="h-[92.3vh] flex bg-gradient-to-br from-light-primary to-light-secondary dark:from-dark-primary dark:to-dark-secondary transition-all">
      {/* Sidebar */}
      <aside className="w-1/4 bg-light-primary overflow-y-scroll p-4 dark:bg-dark-background dark:text-dark-textPrimary">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-light-heading dark:text-dark-textPrimary">
            All Notes
          </h2>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg shadow-md hover:from-green-500 hover:to-green-600 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:shadow-none dark:bg-dark-secondary dark:hover:bg-dark-actionHover dark:focus:ring-dark-divider"
            onClick={addItem}
          >
            <Plus size={16} className="stroke-current" />
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`cursor-pointer p-3 rounded-lg hover:shadow-md transition-all duration-200 ${
                item.id === expandedItemId
                  ? "bg-blue-50 border-2 border-blue-200 dark:bg-dark-secondary dark:border-dark-divider"
                  : "hover:bg-light-hover border border-light-border dark:hover:bg-dark-actionHover dark:border-dark-divider"
              }`}
              onClick={() => setExpandedItemId(item.id)}
            >
              <h3 className="font-semibold truncate text-light-heading dark:text-dark-textPrimary">
                {item.title || "Untitled"}
              </h3>
              <p className="text-sm text-light-subtle truncate mt-1 dark:text-dark-textSecondary">
                {stripHtml(item.content) || "No content"}
              </p>
            </div>
          ))}
        </div>
      </aside>
      {/* Main content */}
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
        <div className="w-3/4">
          {items.map(
            (item) =>
              item.id === expandedItemId && (
                <BulletinItem
                  key={item.id}
                  id={item.id}
                  initialTitle={item.title}
                  initialContent={item.content}
                  onSave={saveItem}
                  onDelete={() => {
                    deleteItem(item.id);
                    setExpandedItemId(null);
                  }}
                  onCollapse={() => setExpandedItemId(null)}
                />
              )
          )}
          {expandedItemId === null && (
            <div className="flex flex-col items-center justify-center w-full h-full bg-light-primary border border-light-border shadow-inner dark:bg-dark-secondary dark:border-dark-divider">
              <p className="text-light-heading text-lg font-medium dark:text-dark-textPrimary">
                No note selected
              </p>
              <p className="text-light-subtle text-sm mt-2 dark:text-dark-textSecondary">
                Click on a note from the sidebar or create a new note
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
