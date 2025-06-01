import { useState, useEffect } from "react";
import { FileText, Plus, Search, Loader2, MoreVertical } from "lucide-react";
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
}

export default function DocumentList({
  onDocumentSelect,
  onCreateDocument,
  userId,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Search */}
      <div className="sm:hidden mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider rounded-full text-sm text-gray-900 dark:text-dark-textPrimary placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all shadow-sm"
          />
        </div>
      </div>

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
                    <button
                      className="p-1 hover:bg-gray-200 dark:hover:bg-dark-divider rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle menu actions
                      }}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500 dark:text-dark-textSecondary" />
                    </button>
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

      {/* Empty State */}
      {filteredDocuments.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-dark-secondary rounded-full flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-gray-400 dark:text-dark-textSecondary" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary mb-2">
            {searchQuery ? "No documents found" : "No documents yet"}
          </h3>
          <p className="text-gray-500 dark:text-dark-textSecondary mb-6 max-w-sm">
            {searchQuery
              ? `No documents match "${searchQuery}". Try adjusting your search.`
              : "Create your first document to get started with your writing journey."}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreateDocument}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-colors duration-200"
            >
              <Plus className="w-5 h-5" />
              Create your first document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
