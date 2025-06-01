"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentList from "@/app/write/_components/DocumentList";

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
    <div className="flex w-full h-screen bg-gray-100 dark:bg-dark-secondary items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-dark-paper rounded-2xl shadow-xl p-8 flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-dark-textPrimary">
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-7 h-7 text-purple-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M9 2v4" />
                <path d="M15 2v4" />
              </svg>
              Your Documents
            </span>
          </h1>
          <DocumentList
            onDocumentSelect={handleDocumentSelect}
            onCreateDocument={handleCreateDocument}
            userId={userId}
          />
        </div>
      </div>
    </div>
  );
}
