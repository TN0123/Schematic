"use client";
import { useEffect, useState } from "react";
import BulletinItem from "./_components/BulletinItem";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
interface BulletinItem {
  id: string;
  title: string;
  content: string;
}

export default function Bulletin() {
  const [items, setItems] = useState<BulletinItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchBulletins();
    }
  }, [session]);

  const fetchBulletins = async () => {
    const response = await fetch("/api/bulletins");
    const data = await response.json();
    setItems(data);
    setExpandedItemId(data.length > 0 ? data[0].id : null);
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
    <div className="min-h-[92.3vh] bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto h-[80vh]">
        <div className="bg-white rounded-2xl shadow-xl p-8 h-full">
          <div className="flex gap-2 h-full">
            {/* Sidebar */}
            <div className="w-1/4 bg-gray-50 overflow-y-scroll rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">
                  All Notes
                </h2>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg shadow-md hover:from-green-500 hover:to-green-600 transition-all duration-200 transform hover:scale-105"
                  onClick={addItem}
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`cursor-pointer p-3 rounded-lg transition-all duration-200 ${
                      item.id === expandedItemId
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "hover:bg-gray-100 border border-gray-200"
                    }`}
                    onClick={() => setExpandedItemId(item.id)}
                  >
                    <h3 className="font-semibold truncate text-gray-800">
                      {item.title || "Untitled"}
                    </h3>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {stripHtml(item.content) || "No content"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* Main content */}
            <div className="w-3/4 rounded-xl">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
