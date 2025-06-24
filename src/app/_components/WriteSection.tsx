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
        router.push(`/write/${newDoc.id}`);
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
    <section>
      <div className="mb-4">
        <TransitionLink
          href="/write"
          className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300"
        >
          <PenLine className="h-6 w-6 mr-3 text-purple-600 dark:text-purple-400" />
          Write
        </TransitionLink>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={handleCreateDocument}
          disabled={isCreating}
          className="bg-white dark:bg-dark-secondary rounded-lg shadow p-4 flex flex-col items-center justify-center text-center hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out group disabled:opacity-75 disabled:cursor-not-allowed"
        >
          <div className="bg-purple-100 dark:bg-purple-900/40 rounded-full p-3 mb-3">
            {isCreating ? (
              <Loader2 className="h-8 w-8 text-purple-600 dark:text-purple-400 animate-spin" />
            ) : (
              <PlusCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-textPrimary">
            {isCreating ? "Creating..." : "New Document"}
          </h3>
        </button>
        {recentDocuments.map((doc) => (
          <TransitionLink
            key={doc.id}
            href={`/write/${doc.id}`}
            className="bg-white dark:bg-dark-secondary rounded-lg shadow p-4 flex flex-col justify-between hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out"
          >
            <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-dark-textPrimary flex-grow">
              {doc.title}
            </h3>
          </TransitionLink>
        ))}
      </div>
    </section>
  );
}
