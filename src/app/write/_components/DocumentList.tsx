"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  Search,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Document } from "@prisma/client";

interface DocumentListProps {
  initialDocuments: Document[];
}

export default function DocumentList({ initialDocuments }: DocumentListProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDocumentSelect = (doc: Document) => {
    router.push(`/write/${doc.id}`);
  };

  const handleCreateDocument = async () => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document", content: "" }),
      });
      if (response.ok) {
        const newDoc = await response.json();
        router.push(`/write/${newDoc.id}`);
      }
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeleting(documentId);
    try {
      const response = await fetch(`/api/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId }),
      });

      if (response.ok) {
        setDocuments((prevDocs) =>
          prevDocs.filter((doc) => doc.id !== documentId)
        );
        setShowDeleteModal(null);
      } else {
        console.error("Failed to delete document");
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setDeleting(null);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-secondary">
      {/* Header */}
      <header className="bg-white dark:bg-dark-paper border-b border-gray-200 dark:border-dark-divider">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-dark-secondary rounded-lg transition-colors lg:hidden">
                <Menu className="w-5 h-5 text-gray-600 dark:text-dark-textSecondary" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                  Write
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-secondary border-0 rounded-full text-sm text-gray-900 dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateDocument}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Document</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-textPrimary mb-2">
            Your Documents
          </h2>
          <p className="text-gray-600 dark:text-dark-textSecondary">
            Create, edit, and organize your documents
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group cursor-pointer"
            onClick={handleCreateDocument}
          >
            <div className="aspect-[3/4] bg-white dark:bg-dark-paper border-2 border-dashed border-gray-300 dark:border-dark-divider rounded-xl hover:border-purple-400 dark:hover:border-purple-400 transition-all duration-200 flex flex-col items-center justify-center p-6 shadow-sm hover:shadow-md">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                <Plus className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-dark-textSecondary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Create new document
              </h3>
            </div>
          </motion.div>

          <AnimatePresence>
            {filteredDocuments.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  transition: { delay: index * 0.05 },
                }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group cursor-pointer"
                onClick={() => handleDocumentSelect(doc)}
              >
                <div className="aspect-[3/4] bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden shadow-sm">
                  <div className="h-3/4 bg-gray-50 dark:bg-dark-secondary p-4 relative">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative" data-dropdown>
                        <button
                          className="p-1 hover:bg-gray-200 dark:hover:bg-dark-divider rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(
                              openDropdown === doc.id ? null : doc.id
                            );
                          }}
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500 dark:text-dark-textSecondary" />
                        </button>
                        {openDropdown === doc.id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg shadow-lg py-1 z-10 min-w-[120px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowDeleteModal(doc.id);
                                setOpenDropdown(null);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="space-y-2">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 bg-gray-200 dark:bg-dark-divider rounded ${
                                i === 0
                                  ? "w-4/5"
                                  : i === 1
                                  ? "w-full"
                                  : i === 2
                                  ? "w-3/4"
                                  : i === 3
                                  ? "w-5/6"
                                  : i === 4
                                  ? "w-2/3"
                                  : "w-1/2"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-1/4 p-4 border-t border-gray-100 dark:border-dark-divider">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-dark-textPrimary mb-1 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-dark-paper rounded-2xl shadow-xl w-full max-w-sm"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  Delete Document
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-textSecondary mb-6">
                  Are you sure you want to delete this document? This action
                  cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-secondary text-sm font-medium text-gray-700 dark:text-dark-textSecondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-divider transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(showDeleteModal!)}
                    disabled={deleting === showDeleteModal}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-sm font-medium text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-red-400"
                  >
                    {deleting === showDeleteModal ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
