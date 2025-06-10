"use client";

import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { Calendar, ClipboardList, PenLine } from "lucide-react";
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
    <div className="min-h-screen bg-white dark:bg-dark-background transition-colors duration-200">
      <div className="relative isolate overflow-hidden">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          aria-hidden="true"
        >
          <div
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-purple-300/70 to-blue-300/70 dark:from-purple-800/30 dark:to-blue-800/30 opacity-70 dark:opacity-50 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

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

          <div className="space-y-24 sm:space-y-32 pb-24 sm:pb-32">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div>
                <div className="inline-block p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg mb-4">
                  <PenLine className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-textPrimary sm:text-4xl">
                  AI Writing Assistant
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-dark-textSecondary">
                  Experience the next generation of productivity with an
                  innovative, AI-enhanced writing editor. Seamlessly integrated
                  into your workflow, our intelligent sidebar lets you chat
                  directly with the AI about your writing or project, offering
                  instant suggestions and actionable edits that you can easily
                  accept or reject just like Cursor or GitHub Copilot. Instantly
                  continue your train of thought with a simple press of
                  Ctrl+Enter, letting the AI pick up exactly where you left off.
                  Want to enhance your writing? Highlight any section and press
                  Ctrl+I to get immediate improvements tailored to your unique
                  voice. With a focus on speed, clarity, and control, our editor
                  puts powerful AI assistance right at your fingertips, helping
                  you write smarter and accomplish more.
                </p>
              </div>
              <div className="relative flex justify-center items-center">
                <div className="absolute w-full max-w-md aspect-square bg-purple-200 dark:bg-purple-900/50 rounded-full blur-3xl opacity-60"></div>
                <div className="relative w-full max-w-sm p-4 sm:p-6 bg-white/60 dark:bg-dark-paper/60 backdrop-blur-lg border border-gray-200/50 dark:border-dark-divider/50 rounded-3xl shadow-2xl shadow-purple-500/10 dark:shadow-black/50">
                  <div className="relative w-full aspect-square flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/40">
                    <PenLine className="h-24 w-24 sm:h-32 sm:w-32 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="md:order-last">
                <div className="inline-block p-3 bg-green-100 dark:bg-green-900/50 rounded-lg mb-4">
                  <ClipboardList className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-textPrimary sm:text-4xl">
                  Intelligent Note-Taking
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-dark-textSecondary">
                  Organize your ideas effortlessly with our versatile Bulletin,
                  designed for clarity and productivity. Whether you're jotting
                  down quick thoughts with text notes, mapping out tasks on an
                  intuitive to-do list, or visualizing projects on dynamic
                  Kanban boards, our app adapts to any workflow. For in-depth
                  research and knowledge management, use the new Link Collection
                  note to efficiently organize, categorize, and visualize links
                  within a powerful knowledge graph. Enjoy a beautifully clean
                  interface that keeps your mind focused and your notes always
                  accessible.
                </p>
              </div>
              <div className="relative flex justify-center items-center md:order-first">
                <div className="absolute w-full max-w-md aspect-square bg-green-200 dark:bg-green-900/50 rounded-full blur-3xl opacity-60"></div>
                <div className="relative w-full max-w-sm p-4 sm:p-6 bg-white/60 dark:bg-dark-paper/60 backdrop-blur-lg border border-gray-200/50 dark:border-dark-divider/50 rounded-3xl shadow-2xl shadow-green-500/10 dark:shadow-black/50">
                  <div className="relative w-full aspect-square flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/40">
                    <ClipboardList className="h-24 w-24 sm:h-32 sm:w-32 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div>
                <div className="inline-block p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg mb-4">
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-textPrimary sm:text-4xl">
                  AI-Powered Scheduling
                </h2>
                <p className="mt-4 text-lg text-gray-600 dark:text-dark-textSecondary">
                  Make scheduling effortless with our intelligent Schedule
                  feature. Just enter your plans in natural language, and watch
                  as they are seamlessly transformed into calendar events.
                  AI-driven suggestions help you optimize planning by
                  considering your ongoing notes, real-time availability, and
                  progress toward your goals. With its elegantly simple
                  interface, calendar management becomes smooth and intuitive,
                  giving you more time to focus on what matters most.
                </p>
              </div>
              <div className="relative flex justify-center items-center">
                <div className="absolute w-full max-w-md aspect-square bg-blue-200 dark:bg-blue-900/50 rounded-full blur-3xl opacity-60"></div>
                <div className="relative w-full max-w-sm p-4 sm:p-6 bg-white/60 dark:bg-dark-paper/60 backdrop-blur-lg border border-gray-200/50 dark:border-dark-divider/50 rounded-3xl shadow-2xl shadow-blue-500/10 dark:shadow-black/50">
                  <div className="relative w-full aspect-square flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/40">
                    <Calendar className="h-24 w-24 sm:h-32 sm:w-32 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
