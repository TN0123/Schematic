"use client";

import {
  Calendar,
  ClipboardList,
  PenLine,
  Brain,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import { motion } from "framer-motion";
import Script from "next/script";

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function About() {
  const features = [
    {
      icon: PenLine,
      title: "Intelligent Writing",
      description:
        "AI-powered writing assistance that helps you create, edit, and organize your thoughts with smart suggestions and context-aware recommendations.",
    },
    {
      icon: ClipboardList,
      title: "Smart Bulletin",
      description:
        "Organize your ideas, tasks, and notes with our intelligent bulletin system that adapts to your workflow and helps you stay focused.",
    },
    {
      icon: Calendar,
      title: "Dynamic Scheduling",
      description:
        "AI-enhanced calendar management that learns from your patterns and helps optimize your time with intelligent scheduling suggestions.",
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description:
        "Get personalized insights and recommendations based on your productivity patterns, helping you work smarter, not harder.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Built for speed and efficiency with modern technology stack, ensuring your productivity tools never slow you down.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description:
        "Your data is secure and private. We use industry-standard encryption and never share your personal information.",
    },
  ];

  const values = [
    {
      icon: Users,
      title: "User-Centric Design",
      description:
        "Every feature is designed with the user in mind, focusing on simplicity, efficiency, and intuitive workflows.",
    },
    {
      icon: Brain,
      title: "AI That Understands",
      description:
        "Our AI doesn't just process data—it understands context, learns from your behavior, and adapts to your unique working style.",
    },
    {
      icon: Zap,
      title: "Continuous Innovation",
      description:
        "We're constantly improving and adding new features based on user feedback and the latest advances in AI technology.",
    },
  ];

  // Animation variants (matching login page)
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.4, ease: "easeOut" },
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

  const navItems = ["Features", "Pricing", "Login", "About"];

  return (
    <>
      <Script
        id="ld-about-page"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Schematic",
          description:
            "Learn about Schematic, an open-source AI-powered productivity workspace designed to help you stay organized, focused, and productive with intelligent task management and personalized AI assistance.",
          url: "https://www.schematic.now/about",
          mainEntity: {
            "@type": "SoftwareApplication",
            name: "Schematic",
            applicationCategory: "ProductivityApplication",
            operatingSystem: "Web",
            description:
              "AI-powered productivity workspace for notes, scheduling, and everyday writing",
            url: "https://www.schematic.now",
            author: {
              "@type": "Organization",
              name: "Schematic",
              url: "https://www.schematic.now",
            },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
            },
            featureList: [
              "Intelligent Writing",
              "Smart Bulletin",
              "Dynamic Scheduling",
              "AI-Powered Insights",
              "Lightning Fast",
              "Privacy First",
            ],
          },
        })}
      </Script>
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
                  <img
                    src="/favicon.ico"
                    alt=""
                    className="h-6 w-6 shadow-xl"
                  />
                  <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-textPrimary">
                    Schematic
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  {navItems.map((item) => {
                    const baseButtonClasses =
                      "inline-flex items-center h-10 px-1 text-sm text-gray-700 dark:text-dark-textSecondary hover:text-gray-900 dark:hover:text-dark-textPrimary transition-colors";
                    if (item === "Features") {
                      return (
                        <div
                          key={item}
                          className="relative flex items-center h-10"
                        >
                          <TransitionLink
                            href="/auth/login"
                            className={baseButtonClasses}
                          >
                            {item}
                          </TransitionLink>
                        </div>
                      );
                    }
                    if (item === "Pricing") {
                      return (
                        <div
                          key={item}
                          className="relative flex items-center h-10"
                        >
                          <TransitionLink
                            href="/auth/login#pricing-section"
                            className={baseButtonClasses}
                          >
                            {item}
                          </TransitionLink>
                        </div>
                      );
                    }
                    if (item === "Login") {
                      return (
                        <div
                          key={item}
                          className="relative flex items-center h-10"
                        >
                          <TransitionLink
                            href="/auth/login"
                            className={baseButtonClasses}
                          >
                            {item}
                          </TransitionLink>
                        </div>
                      );
                    }
                    if (item === "About") {
                      return (
                        <div
                          key={item}
                          className="relative flex items-center h-10"
                        >
                          <span
                            className={
                              baseButtonClasses +
                              " text-gray-900 dark:text-dark-textPrimary"
                            }
                          >
                            {item}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={item}
                        className="relative flex items-center h-10"
                      >
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

        <main
          className="max-w-7xl mx-auto px-4 sm:px-6 pt-24"
          role="main"
          aria-label="About Schematic"
        >
          {/* Hero Section */}
          <motion.div
            className="text-center py-16 sm:py-24 space-y-8"
            variants={staggerVariants}
            initial="initial"
            animate="animate"
          >
            <motion.h1
              className="text-4xl sm:text-6xl lg:text-7xl tracking-tight text-gray-900 dark:text-dark-textPrimary"
              variants={fadeUpVariants}
            >
              About Schematic
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl text-gray-600 dark:text-dark-textSecondary max-w-3xl mx-auto"
              variants={fadeUpVariants}
            >
              Schematic is an open-source AI-powered productivity workspace
              designed to help you stay organized, focused, and productive. We
              combine intelligent task management with personalized AI
              assistance to create a seamless workflow experience.
            </motion.p>
          </motion.div>

          {/* Questions/Feedback Section */}
          <motion.section
            className="py-16 sm:py-24"
            variants={staggerVariants}
            initial="initial"
            animate="animate"
            aria-labelledby="contact-heading"
          >
            <motion.div
              className="max-w-2xl mx-auto text-center"
              variants={fadeUpVariants}
            >
              <h2
                id="contact-heading"
                className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary mb-4"
              >
                Questions or Feedback?
              </h2>

              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-dark-textSecondary mb-2">
                    Email us at
                  </p>
                  <a
                    href="mailto:tanaynaik149@gmail.com"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    tanaynaik149@gmail.com
                  </a>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-dark-textSecondary mb-2">
                    Interested in contributing? Visit our GitHub
                  </p>
                  <a
                    href="https://github.com/TN0123/Schematic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    github.com/TN0123/Schematic
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.section>
        </main>
      </motion.div>
    </>
  );
}
