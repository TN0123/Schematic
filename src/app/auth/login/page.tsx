"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useModifierKeyLabel } from "@/components/utils/platform";
import { Calendar, ClipboardList, PenLine, Check } from "lucide-react";
import { redirect } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
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

  const pricingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPricingTooltip, setShowPricingTooltip] = useState(false);

  const handleScrollTo = (section: "write" | "bulletin" | "schedule") => {
    // Set the corresponding slide
    const slideIndex = features.findIndex(
      (feature) => feature.title.toLowerCase() === section
    );
    if (slideIndex !== -1) {
      setCurrentSlide(slideIndex);
    }

    // Scroll to the carousel
    const carouselEl = document.getElementById("feature-carousel");
    if (carouselEl) {
      const rect = carouselEl.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset + rect.top - window.innerHeight * 0.1;
      window.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  };

  const handlePricingClick = () => {
    setShowPricingTooltip(true);
    if (pricingTimeoutRef.current) clearTimeout(pricingTimeoutRef.current);
    pricingTimeoutRef.current = setTimeout(
      () => setShowPricingTooltip(false),
      1500
    );
  };

  useEffect(() => {
    return () => {
      if (pricingTimeoutRef.current) clearTimeout(pricingTimeoutRef.current);
    };
  }, []);

  const features = [
    {
      icon: PenLine,
      title: "Write",
      description: "Cursor for everyday writing.",
      color: "purple",
      image: "/write-image.png",
      highlights: [
        "AI sidebar that automatically keeps track of what you're writing about",
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
      image: "/bulletin-image.png",
      highlights: [
        "Custom interactive note formats from natural language descriptions",
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
      image: "/schedule-image.png",
      highlights: [
        "Create events through text, voice, or file uploads (PDFs, images)",
        "AI assistant suggests events based on your availability, goals, and habits",
        "Chat with your personal assistant for schedule advice and optimization",
        "AI maintains context about your preferences with manual editing control",
        "View insights and analytics about where your time is being spent",
      ],
    },
  ];

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const navItems = [
    "Write",
    "Bulletin",
    "Schedule",
    "Pricing",
    "Login",
    "About",
  ];

  // Animation variants
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  } as const;

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  } as const;

  const fadeDownVariants = {
    hidden: { opacity: 0, y: -12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut", delay: 0.05 },
    },
  } as const;

  const staggerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08, delayChildren: 0.12 },
    },
  } as const;

  return (
    <motion.div
      className="min-h-screen bg-white dark:bg-dark-background transition-colors duration-200"
      initial="hidden"
      animate="visible"
      variants={pageVariants}
    >
      <motion.nav className="sticky top-4 z-40" variants={fadeDownVariants}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 rounded-2xl border border-white/30 dark:border-white/10 bg-white/60 dark:bg-dark-paper/30 backdrop-blur-xl backdrop-saturate-150 shadow-lg ring-1 ring-black/5 dark:ring-white/5">
            <div className="h-full flex items-center justify-center md:justify-between px-4">
              <div className="flex items-center gap-2">
                <img src="/favicon.ico" alt="" className="h-6 w-6 shadow-xl" />
                <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
                  Schematic
                </span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                {navItems.map((item) => {
                  const baseButtonClasses =
                    "inline-flex items-center h-10 px-1 text-sm text-gray-700 dark:text-dark-textSecondary hover:text-gray-900 dark:hover:text-dark-textPrimary transition-colors";
                  if (item === "Pricing") {
                    return (
                      <div
                        key={item}
                        className="relative flex items-center h-10"
                      >
                        <button
                          type="button"
                          onClick={handlePricingClick}
                          className={baseButtonClasses}
                        >
                          {item}
                        </button>
                        <AnimatePresence>
                          {showPricingTooltip && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="absolute left-[-10px] top-full mt-2 z-50"
                            >
                              <div className="px-3.5 py-2 text-xs text-center font-medium rounded-lg border border-gray-200 dark:border-dark-divider bg-white dark:bg-dark-secondary text-gray-900 dark:text-dark-textPrimary shadow-lg">
                                Coming soon!
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }
                  if (
                    item === "Write" ||
                    item === "Bulletin" ||
                    item === "Schedule"
                  ) {
                    return (
                      <div
                        key={item}
                        className="relative flex items-center h-10"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleScrollTo(
                              item.toLowerCase() as
                                | "write"
                                | "bulletin"
                                | "schedule"
                            )
                          }
                          className={baseButtonClasses}
                        >
                          {item}
                        </button>
                      </div>
                    );
                  }
                  if (item === "Login") {
                    return (
                      <div
                        key={item}
                        className="relative flex items-center h-10"
                      >
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className={baseButtonClasses}
                        >
                          {item}
                        </button>
                      </div>
                    );
                  }
                  if (item === "About") {
                    return (
                      <div
                        key={item}
                        className="relative flex items-center h-10"
                      >
                        <Link href="/about" className={baseButtonClasses}>
                          {item}
                        </Link>
                      </div>
                    );
                  }
                  return (
                    <div key={item} className="relative flex items-center h-10">
                      <button type="button" className={baseButtonClasses}>
                        {item}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
        <motion.div
          className="text-center py-20 sm:py-32 space-y-6"
          variants={staggerVariants}
        >
          <motion.h1
            className="text-4xl sm:text-6xl lg:text-7xl tracking-tight text-gray-900 dark:text-dark-textPrimary"
            variants={fadeUpVariants}
          >
            Your AI Productivity Workspace
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl text-gray-600 dark:text-dark-textSecondary max-w-2xl mx-auto leading-relaxed px-4"
            variants={fadeUpVariants}
          >
            Schematic helps you stay organized, focused, and productive with
            intelligent task management and personalized assistance.
          </motion.p>

          <motion.div
            className="flex w-full items-center justify-center pt-6"
            variants={fadeUpVariants}
          >
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto py-3.5 px-8 bg-white hover:bg-gray-50 dark:bg-dark-paper dark:hover:bg-dark-hover text-gray-900 dark:text-dark-textPrimary font-semibold text-base rounded-xl border border-gray-200 dark:border-dark-divider shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
          </motion.div>
        </motion.div>

        {/* Feature Carousel */}
        <div id="feature-carousel" className="pb-12 sm:pb-16">
          <motion.div
            className="w-full"
            variants={staggerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="relative">
              {/* Image Section with Overlay Header */}
              <div className="mb-10">
                <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentSlide}
                      src={features[currentSlide].image}
                      alt={`${features[currentSlide].title} feature demonstration`}
                      className="w-full h-auto"
                      initial={{ opacity: 0, scale: 1.02 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    />
                  </AnimatePresence>

                  {/* Overlay Header */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-transparent">
                    <div className="absolute top-8 left-8 right-8">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentSlide}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="flex items-center gap-4"
                        >
                          {(() => {
                            const feature = features[currentSlide];
                            const Icon = feature.icon;
                            const colorClassesMap = {
                              purple: {
                                icon: "text-purple-400",
                                bg: "bg-purple-100/90",
                              },
                              green: {
                                icon: "text-green-500",
                                bg: "bg-green-100/90",
                              },
                              blue: {
                                icon: "text-blue-400",
                                bg: "bg-blue-100/90",
                              },
                            };
                            const colorClasses =
                              colorClassesMap[
                                feature.color as keyof typeof colorClassesMap
                              ];

                            return (
                              <>
                                <div
                                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colorClasses.bg} ring-1 ring-white/20`}
                                >
                                  <Icon
                                    className={`h-6 w-6 ${colorClasses.icon}`}
                                  />
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                                  {feature.title}
                                </h3>
                              </>
                            );
                          })()}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dots Navigation */}
              <div className="flex justify-center mb-10 gap-2.5">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? "w-8 h-3 bg-gray-900 dark:bg-dark-textPrimary"
                        : "w-3 h-3 bg-gray-300 dark:bg-dark-divider hover:bg-gray-400 dark:hover:bg-dark-textSecondary"
                    }`}
                    aria-label={`Go to ${features[index].title} feature`}
                  />
                ))}
              </div>

              {/* Content Section */}
              <div className="w-full px-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    {(() => {
                      const feature = features[currentSlide];
                      const colorClassesMap = {
                        purple: {
                          icon: "text-purple-600 dark:text-purple-400",
                        },
                        green: {
                          icon: "text-green-600 dark:text-green-400",
                        },
                        blue: {
                          icon: "text-blue-600 dark:text-blue-400",
                        },
                      };
                      const colorClasses =
                        colorClassesMap[
                          feature.color as keyof typeof colorClassesMap
                        ];

                      return (
                        <div className="text-center">
                          <p className="text-base sm:text-lg text-gray-600 dark:text-dark-textSecondary max-w-3xl mx-auto mb-10 leading-relaxed">
                            {feature.description}
                          </p>

                          <ul className="space-y-5 max-w-2xl mx-auto text-left">
                            {feature.highlights.map((highlight, i) => (
                              <li key={i} className="flex items-start gap-3.5">
                                <Check
                                  className={`h-5 w-5 ${colorClasses.icon} flex-shrink-0 mt-0.5`}
                                />
                                <span className="text-base text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                                  {highlight}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
}
