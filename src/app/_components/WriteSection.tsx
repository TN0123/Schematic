"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, PenLine, PlusCircle, Loader2 } from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";

interface Document {
  id: string;
  title: string;
}

interface WriteSectionProps {
  recentDocuments: Document[];
}

export default function WriteSection({ recentDocuments }: WriteSectionProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateDocument = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document", content: "" }),
      });
      if (response.ok) {
        const newDoc = await response.json();
        router.push(`/notebook/${newDoc.id}`);
      } else {
        console.error("Failed to create document");
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      setIsCreating(false);
    }
  };

  return (
    <section className="h-auto md:h-full flex flex-col">
      <div className="mb-4">
        <TransitionLink
          href="/notebook"
          className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300"
        >
          <PenLine className="h-6 w-6 mr-3 text-purple-600 dark:text-purple-400" />
          Notebook
        </TransitionLink>
      </div>
      <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-4 space-y-3 flex-1 flex flex-col min-h-0 md:min-h-0">
        <div className="flex-1 space-y-3">
          <button
            onClick={handleCreateDocument}
            disabled={isCreating}
            className="block p-3 rounded-md bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all duration-300 ease-in-out group disabled:opacity-75 disabled:cursor-not-allowed w-full"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 dark:bg-purple-900/40 rounded-full p-1">
                {isCreating ? (
                  <Loader2 className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <span className="font-medium text-gray-900 dark:text-dark-textPrimary">
                {isCreating ? "Creating..." : "New Document"}
              </span>
            </div>
          </button>
          {recentDocuments.map((doc) => (
            <TransitionLink
              key={doc.id}
              href={`/notebook/${doc.id}`}
              className="block p-3 rounded-md bg-gray-50 dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-300 ease-in-out"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
                <p className="text-gray-800 dark:text-dark-textSecondary truncate">
                  {doc.title}
                </p>
              </div>
            </TransitionLink>
          ))}
        </div>
        <TransitionLink
          href="/notebook"
          className="flex items-center text-purple-600 dark:text-purple-400 text-sm pt-1 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200"
        >
          Go to Notebook →
        </TransitionLink>
      </div>
    </section>
  );
}
