import Link from "next/link";
import { Calendar, ClipboardList, Zap } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center h-screen py-2 bg-gray-50 dark:bg-dark-background transition-all">
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <h1 className="text-4xl text-center font-bold text-gray-900 dark:text-dark-textPrimary mb-8">
          Welcome to Schematic
        </h1>
        <p className="text-lg text-center text-gray-600 dark:text-dark-textSecondary mb-12">
          Your all-in-one solution for writing, note taking, and scheduling.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.path}
              className="bg-white dark:bg-dark-secondary rounded-lg shadow-lg p-6 hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 ease-in-out"
            >
              <div className="flex items-center mb-4">
                {section.title === "Write" && (
                  <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                )}
                {section.title === "Bulletin" && (
                  <ClipboardList className="h-8 w-8 text-green-600 dark:text-green-400" />
                )}
                {section.title === "Schedule" && (
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                )}
                <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-textPrimary ml-4">
                  {section.title}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-dark-textSecondary">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
