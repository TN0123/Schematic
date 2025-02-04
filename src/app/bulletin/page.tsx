"use client";
import { useState } from "react";
import BulletinItem from "./_components/BulletinItem";

interface BulletinItem {
  id: number;
  title: string;
  content: string;
}

export default function Bulletin() {
  const [items, setItems] = useState<BulletinItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const updateTitle = (id: number, newTitle: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, title: newTitle } : item
      )
    );
  };

  const addItem = () => {
    const newId = Date.now();
    setItems([
      ...items,
      {
        id: newId,
        title: "New Note",
        content: "",
      },
    ]);
    setExpandedItemId(newId);
  };

  const deleteItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto h-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[90vh]">
          <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
            Bulletin
          </h1>

          <div className="mb-8 flex justify-between items-center">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg shadow-md hover:from-green-500 hover:to-green-600 transition-all duration-200 transform hover:scale-105"
              onClick={addItem}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>

            {items.length > 0 && (
              <p className="text-gray-500">
                {items.length} note{items.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {expandedItemId ? (
            <div className="flex gap-6 h-[calc(100vh-300px)]">
              <div className="w-1/4 bg-gray-50 rounded-xl p-4 overflow-y-auto">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  All Notes
                </h2>
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
                        {item.content || "No content"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-3/4 bg-white rounded-xl">
                {items.map(
                  (item) =>
                    item.id === expandedItemId && (
                      <BulletinItem
                        key={item.id}
                        title={item.title}
                        initialContent={item.content}
                        onTitleChange={(newTitle) =>
                          updateTitle(item.id, newTitle)
                        }
                        onContentChange={(newContent) => {
                          setItems(
                            items.map((i) =>
                              i.id === item.id
                                ? { ...i, content: newContent }
                                : i
                            )
                          );
                        }}
                        onDelete={() => {
                          deleteItem(item.id);
                          setExpandedItemId(null);
                        }}
                        isExpanded={true}
                        onCollapse={() => setExpandedItemId(null)}
                      />
                    )
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {items.length === 0 ? (
                <div className="col-span-3 text-center py-16">
                  <p className="text-gray-500 text-lg">
                    No notes yet. Click "Add New Note" to get started!
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <BulletinItem
                    key={item.id}
                    title={item.title}
                    initialContent={item.content}
                    onTitleChange={(newTitle) => updateTitle(item.id, newTitle)}
                    onContentChange={(newContent) => {
                      setItems(
                        items.map((i) =>
                          i.id === item.id ? { ...i, content: newContent } : i
                        )
                      );
                    }}
                    onDelete={() => deleteItem(item.id)}
                    isExpanded={false}
                    onExpand={() => setExpandedItemId(item.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
