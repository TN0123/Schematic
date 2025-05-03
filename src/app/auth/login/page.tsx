"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { Calendar, ClipboardList, Router, Zap } from "lucide-react";
import { redirect } from "next/navigation";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-background dark:to-dark-secondary transition-all duration-200">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-dark-textPrimary mb-6">
              Your AI Productivity Assistant
            </h1>
            <p className="text-xl text-gray-600 dark:text-dark-textSecondary mb-12 max-w-2xl mx-auto">
              Schematic helps you stay organized, focused, and productive with
              intelligent task management and personalized assistance.
            </p>

            <div className="flex w-full items-center justify-center">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-1/3 py-3 px-4 bg-white hover:bg-gray-50 dark:bg-dark-paper dark:hover:bg-dark-hover text-gray-900 dark:text-dark-textPrimary font-medium rounded-xl border border-gray-200 dark:border-dark-divider shadow-sm hover:shadow-md hover:translate-y-[-1px] active:translate-y-[1px] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md-grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-lg dark:shadow-md p-8 hover:shadow-xl dark:hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-6">
              <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary mb-4">
              AI Writing Assistant
            </h2>
            <p className="text-gray-600 dark:text-dark-textSecondary">
              Enhance your writing with AI-powered suggestions, content
              generation, and real-time improvements for emails, documents, and
              more.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-lg dark:shadow-md p-8 hover:shadow-xl dark:hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-6">
              <ClipboardList className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary mb-4">
              Intelligent Note-Taking
            </h2>
            <p className="text-gray-600 dark:text-dark-textSecondary">
              Capture and organize your ideas seamlessly with AI-assisted
              note-taking, smart categorization, and instant retrieval.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-lg dark:shadow-md p-8 hover:shadow-xl dark:hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary mb-4">
              AI-Powered Scheduling
            </h2>
            <p className="text-gray-600 dark:text-dark-textSecondary">
              Let AI help you plan your day efficiently—quickly create events,
              prioritize tasks, and manage your time effortlessly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
