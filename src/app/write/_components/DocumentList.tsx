import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  userId: string;
}

interface DocumentListProps {
  onDocumentSelect: (document: Document) => void;
  onCreateDocument: () => void;
  userId: string | undefined;
  searchQuery?: string;
}

export default function DocumentList({
  onDocumentSelect,
  onCreateDocument,
  userId,
  searchQuery: externalSearchQuery,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Use external search query if provided, otherwise use internal one
  const activeSearchQuery = externalSearchQuery ?? internalSearchQuery;

  useEffect(() => {
    console.log("Current openDropdown state:", openDropdown);
  }, [openDropdown]);

  useEffect(() => {
    if (userId) {
      fetchDocuments();
    }
  }, [userId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeleting(documentId);
    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: documentId }),
      });

      if (response.ok) {
        setDocuments(documents.filter((doc) => doc.id !== documentId));
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
    doc.title.toLowerCase().includes(activeSearchQuery.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Search - only show if no external search query is provided */}
      {!externalSearchQuery && (
        <div className="sm:hidden mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documents..."
              value={internalSearchQuery}
              onChange={(e) => setInternalSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-full text-sm text-gray-900 dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Create New Document Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group cursor-pointer"
          onClick={onCreateDocument}
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

        {/* Document Cards */}
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
              onClick={() => onDocumentSelect(doc)}
            >
              <div className="aspect-[3/4] bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden shadow-sm">
                {/* Document Preview */}
                <div className="h-3/4 bg-gray-50 dark:bg-dark-secondary p-4 relative">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative" data-dropdown>
                      <button
                        className="p-1 hover:bg-gray-200 dark:hover:bg-dark-divider rounded"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newState =
                            openDropdown === doc.id ? null : doc.id;
                          setOpenDropdown(newState);
                        }}
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500 dark:text-dark-textSecondary" />
                      </button>

                      {/* Dropdown Menu */}
                      {openDropdown === doc.id &&
                        (console.log(
                          "Rendering dropdown menu for doc:",
                          doc.id
                        ),
                        (
                          <div
                            className="absolute right-0 top-full mt-1 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-lg shadow-lg py-1 z-[9999] min-w-[120px]"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
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
                        ))}
                    </div>
                  </div>

                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-purple-500" />
                    </div>

                    {/* Document content preview */}
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

                {/* Document Info */}
                <div className="h-1/4 p-4 border-t border-gray-100 dark:border-dark-divider">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-dark-textPrimary mb-1 truncate">
                    {doc.title || "Untitled Document"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                    {new Date(doc.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 dark:bg-black dark:bg-opacity-30 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-dark-paper rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
              Delete Document
            </h3>
            <p className="text-gray-600 dark:text-dark-textSecondary mb-6">
              Are you sure you want to delete "
              {documents.find((d) => d.id === showDeleteModal)?.title ||
                "Untitled Document"}
              "? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-secondary rounded-lg transition-colors"
                disabled={deleting === showDeleteModal}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDocument(showDeleteModal)}
                disabled={deleting === showDeleteModal}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting === showDeleteModal && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
