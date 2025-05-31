import Link from "next/link";
import { Calendar, ClipboardList, PenLine } from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";

export default function Home() {
  const sections = [
    {
      title: "Write",
      description: "Write effortlessly with the help of AI.",
      path: "/write",
    },
    {
      title: "Bulletin",
      description: "Capture and organize thoughts in one convenient place.",
      path: "/bulletin",
    },
    {
      title: "Schedule",
      description: "Schedule and plan tasks seamlessly.",
      path: "/schedule",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-screen py-4 px-4 bg-gray-50 dark:bg-dark-background transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <h1 className="text-3xl sm:text-4xl text-center font-bold text-gray-900 dark:text-dark-textPrimary mb-6 sm:mb-8">
          Welcome to Schematic
        </h1>
        <p className="text-base sm:text-lg text-center text-gray-600 dark:text-dark-textSecondary mb-8 sm:mb-12">
          Your all-in-one solution for writing, note taking, and scheduling.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {sections.map((section) => (
            <TransitionLink
              key={section.title}
              href={section.path}
              className="bg-white dark:bg-dark-secondary rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 ease-in-out"
            >
              <div className="flex items-center mb-3 sm:mb-4">
                {section.title === "Write" && (
                  <PenLine className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                )}
                {section.title === "Bulletin" && (
                  <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-400 dark:text-green-400" />
                )}
                {section.title === "Schedule" && (
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                )}
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-dark-textPrimary ml-3 sm:ml-4">
                  {section.title}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-textSecondary">
                {section.description}
              </p>
            </TransitionLink>
          ))}
        </div>
      </div>
    </div>
  );
}
