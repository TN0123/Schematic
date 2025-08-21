"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { useModifierKeyLabel } from "@/components/utils/platform";
import { Calendar, ClipboardList, PenLine, Check } from "lucide-react";
import { redirect } from "next/navigation";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();
  const modKeyLabel = useModifierKeyLabel();

  if (status === "authenticated") {
    redirect("/");
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: PenLine,
      title: "Write",
      description:
        "AI-powered writing editor with deep integration and GitHub Copilot-style sidebar for seamless human+AI collaboration.",
      color: "purple",
      highlights: [
        "AI chat sidebar with document-level context that dynamically learns what you're writing about",
        "Select any text as context for AI queries",
        `Instant AI continuation with ${modKeyLabel}+Enter in your writing style`,
        `Smart text improvements with ${modKeyLabel}+I over highlighted text`,
      ],
    },
    {
      icon: ClipboardList,
      title: "Bulletin",
      description:
        "AI-powered notes app that generates custom interactive layouts from natural language descriptions. Refactor and customize anytime.",
      color: "green",
      highlights: [
        "AI-powered custom and dynamic interactive note formats from natural language descriptions",
        "Text notes and to-do lists",
        "Dynamic Kanban boards",
        "Knowledge graph based bookmarks",
      ],
    },
    {
      icon: Calendar,
      title: "Schedule",
      description:
        "Text-first calendar with personalized AI assistant that learns your preferences and optimizes your time.",
      color: "blue",
      highlights: [
        "Create events through text, voice, or file uploads (PDFs, images)",
        "AI assistant suggests events based on your availability and habits",
        "Chat with your personal assistant for schedule advice and optimization",
        "AI maintains context about your preferences with manual editing control",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-dark-background transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center py-24 sm:py-32 space-y-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-dark-textPrimary">
            Your AI Productivity Assistant
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-dark-textSecondary max-w-3xl mx-auto">
            Schematic helps you stay organized, focused, and productive with
            intelligent task management and personalized assistance.
          </p>

          <div className="flex w-full items-center justify-center pt-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto py-4 px-8 bg-white hover:bg-gray-50 dark:bg-dark-paper dark:hover:bg-dark-hover text-gray-900 dark:text-dark-textPrimary font-medium rounded-xl border border-gray-200 dark:border-dark-divider shadow-sm hover:shadow-lg hover:translate-y-[-2px] active:translate-y-[1px] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-gray-900 dark:text-dark-textPrimary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Continue with Google</span>
              )}
            </button>
          </div>
        </div>

        {/* Three Feature Boxes Section */}
        <div className="pb-12 sm:pb-16">
          <div className="grid lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClassesMap = {
                purple: {
                  icon: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-100 dark:bg-purple-900/50",
                  border: "border-purple-200 dark:border-purple-800/50",
                },
                green: {
                  icon: "text-green-600 dark:text-green-400",
                  bg: "bg-green-100 dark:bg-green-900/50",
                  border: "border-green-200 dark:border-green-800/50",
                },
                blue: {
                  icon: "text-blue-600 dark:text-blue-400",
                  bg: "bg-blue-100 dark:bg-blue-900/50",
                  border: "border-blue-200 dark:border-blue-800/50",
                },
              };
              const colorClasses =
                colorClassesMap[feature.color as keyof typeof colorClassesMap];

              return (
                <div
                  key={index}
                  className={`bg-white dark:bg-dark-secondary rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border ${colorClasses.border} hover:scale-105`}
                >
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colorClasses.bg} mb-6`}
                  >
                    <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-dark-textPrimary mb-4">
                    {feature.title}
                  </h3>

                  <p className="text-gray-600 dark:text-dark-textSecondary mb-6">
                    {feature.description}
                  </p>

                  <ul className="space-y-3">
                    {feature.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check
                          className={`h-5 w-5 ${colorClasses.icon} flex-shrink-0 mt-0.5`}
                        />
                        <span className="text-sm text-gray-600 dark:text-dark-textSecondary">
                          {highlight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
