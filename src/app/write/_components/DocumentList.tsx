import { useState, useEffect } from "react";
import { FileText, Plus, Search, Loader2 } from "lucide-react";
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

  return (
    <div className="w-full bg-white dark:bg-dark-paper rounded-xl shadow p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-dark-secondary border border-gray-200 dark:border-dark-divider rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-dark-textPrimary transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>
      <button
        onClick={onCreateDocument}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-base font-semibold shadow transition-colors duration-200 mb-2"
      >
        <Plus className="w-5 h-5" />
        New Document
      </button>
      <div className="flex-1 overflow-y-auto p-2 min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-dark-textSecondary py-8">
            <FileText className="w-14 h-14 mb-2" />
            <p className="text-base font-medium">No documents found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredDocuments.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 mb-2 bg-gray-50 dark:bg-dark-secondary rounded-lg cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors duration-200 shadow-sm flex items-center gap-3"
                onClick={() => onDocumentSelect(doc)}
              >
                <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 dark:text-dark-textPrimary truncate">
                    {doc.title || "Untitled Document"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-dark-textSecondary">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
