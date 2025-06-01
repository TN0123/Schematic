"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentList from "@/app/write/_components/DocumentList";
import { Search, Plus, FileText, Menu } from "lucide-react";

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  userId: string;
}

export default function DocumentsPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const router = useRouter();

  useEffect(() => {
    async function fetchUserId() {
      try {
        const res = await fetch("/api/user/onboarding-status");
        const data = await res.json();
        setUserId(data.id);
      } catch (error) {
        console.error("Failed to fetch user id:", error);
      }
    }
    fetchUserId();
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
                  Schematic
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

        {/* Document Grid */}
        <DocumentList
          onDocumentSelect={handleDocumentSelect}
          onCreateDocument={handleCreateDocument}
          userId={userId}
        />
      </main>
    </div>
  );
}
