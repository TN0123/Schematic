"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  PlusCircle,
  Loader2,
  NotepadText,
  Columns,
  Sparkles,
} from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";

interface BulletinNote {
  id: string;
  title: string;
  type: string;
}

interface BulletinSectionProps {
  bulletinNotes: BulletinNote[];
}

export default function BulletinSection({
  bulletinNotes,
}: BulletinSectionProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const getNoteIcon = (type: string) => {
    switch (type) {
      case "text":
        return (
          <NotepadText className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
        );
      case "todo":
        return (
          <ClipboardList className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
        );
      case "kanban":
        return (
          <Columns className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
        );
      case "dynamic":
        return (
          <Sparkles className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
        );
      default:
        return (
          <NotepadText className="h-5 w-5 text-gray-400 dark:text-dark-textSecondary flex-shrink-0" />
        );
    }
  };

  const handleCreateNote = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const response = await fetch("/api/bulletins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Note",
          content: "",
          type: "text",
        }),
      });
      if (response.ok) {
        const newNote = await response.json();
        router.push(`/bulletin?noteId=${newNote.id}`);
      } else {
        console.error("Failed to create note");
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Failed to create note:", error);
      setIsCreating(false);
    }
  };

  return (
    <section className="h-auto md:h-full flex flex-col">
      <div className="mb-4">
        <TransitionLink
          href="/bulletin"
          className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary hover:text-green-600 dark:hover:text-green-400 transition-colors duration-300"
        >
          <ClipboardList className="h-6 w-6 mr-3 text-green-500 dark:text-green-400" />
          Bulletin
        </TransitionLink>
      </div>
      <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-4 space-y-3 flex-1 flex flex-col min-h-0 md:min-h-0">
        <div className="flex-1 space-y-3">
          <button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="block p-3 rounded-md bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-300 ease-in-out group disabled:opacity-75 disabled:cursor-not-allowed w-full"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-900/40 rounded-full p-1">
                {isCreating ? (
                  <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
              </div>
              <span className="font-medium text-gray-900 dark:text-dark-textPrimary">
                {isCreating ? "Creating..." : "New Note"}
              </span>
            </div>
          </button>
          {bulletinNotes.map((note) => (
            <TransitionLink
              key={note.id}
              href={`/bulletin?noteId=${note.id}`}
              className="block p-3 rounded-md bg-gray-50 dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-300 ease-in-out"
            >
              <div className="flex items-center space-x-3">
                {getNoteIcon(note.type)}
                <p className="text-gray-800 dark:text-dark-textSecondary truncate">
                  {note.title}
                </p>
              </div>
            </TransitionLink>
          ))}
        </div>
        <TransitionLink
          href="/bulletin"
          className="flex items-center text-green-600 dark:text-green-400 text-sm pt-1 hover:text-green-700 dark:hover:text-green-300 transition-colors duration-200"
        >
          Go to Bulletin →
        </TransitionLink>
      </div>
    </section>
  );
}
