"use client";

import { motion } from "framer-motion";
import { TransitionLink } from "@/components/utils/TransitionLink";
import {
  Shield,
  Lock,
  Eye,
  Database,
  User,
  Mail,
  Calendar,
} from "lucide-react";

export default function PrivacyPolicy() {
  const navItems = ["Features", "Pricing", "Login", "About"];

  // Animation variants (matching other pages)
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

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const staggerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const privacySections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        "Account Information: When you sign up, we collect your email address and basic profile information from your Google account.",
        "Usage Data: We collect information about how you use Schematic, including documents created, notes written, and number of calendar events.",
        "Calendar Data: If you enable Google Calendar sync, we collect and sync your calendar events, including event titles, descriptions, dates, times, and attendees.",
        "Device Information: We may collect information about your device, browser type, and operating system to improve our service.",
      ],
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: [
        "Service Provision: To provide and maintain our app's features and functionality.",
        "Calendar Sync: To synchronize your events between Schematic and Google Calendar when you enable this feature.",
        "Improvement: To analyze usage patterns and improve our algorithms and user experience.",
        "Communication: To send you important updates about the app and respond to your inquiries.",
      ],
    },
    {
      icon: Lock,
      title: "Data Security",
      content: [
        "Encryption: All data is encrypted in transit and at rest using industry-standard encryption protocols.",
        "Access Controls: We implement strict access controls and regularly audit who can access your data.",
        "Secure Infrastructure: Our servers are hosted on secure, enterprise-grade cloud infrastructure.",
      ],
    },
    {
      icon: User,
      title: "Your Rights",
      content: [
        "Access: You can request a copy of all personal data we have about you, including synced calendar events.",
        "Correction: You can update or correct your personal information at any time, including calendar events.",
        "Deletion: You can request deletion of your account and associated data, including all synced calendar information.",
        "Portability: You can export your data in a standard format, including calendar events.",
        "Calendar Control: You can disable Google Calendar sync at any time, which will stop data sharing with Google.",
        "Google Account: You can revoke Schematic's access to your Google Calendar through your Google Account settings.",
      ],
    },
    {
      icon: Shield,
      title: "Data Sharing",
      content: [
        "No Sale: We never sell your personal information to third parties.",
        "Google Calendar Integration: When you enable calendar sync, we share your calendar events with Google Calendar API to maintain synchronization between platforms.",
        "Limited Sharing: We only share data with trusted service providers who help us operate our app.",
        "Legal Requirements: We may disclose information if required by law or to protect our rights.",
        "Consent: We will always ask for your explicit consent before sharing data for any other purpose.",
      ],
    },
    {
      icon: Calendar,
      title: "Google Calendar Integration",
      content: [
        "Optional Feature: Google Calendar sync is completely optional and can be enabled or disabled at any time in your settings.",
        "Data Access: When enabled, we access your Google Calendar events through Google's secure API to provide synchronization services.",
        "Event Sync: We sync event titles, descriptions, dates, times, and attendee information between Schematic and your Google Calendar.",
        "Real-time Updates: Changes made in either platform are automatically synchronized using Google's webhook notifications.",
        "Data Control: You maintain full control over your calendar data and can revoke access or disable sync at any time.",
        "Google's Privacy Policy: Your calendar data is also subject to Google's Privacy Policy when using Google Calendar services.",
      ],
    },
  ];

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
                        <TransitionLink
                          href="/about"
                          className={baseButtonClasses}
                        >
                          {item}
                        </TransitionLink>
                      </div>
                    );
                  }
                  if (item === "Privacy") {
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div
          className="text-center py-16 space-y-6"
          variants={staggerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.h1
            className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-dark-textPrimary"
            variants={fadeUpVariants}
          >
            Privacy Policy
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-dark-textSecondary max-w-3xl mx-auto"
            variants={fadeUpVariants}
          >
            Your privacy is important to us. This policy explains how we
            collect, use, and protect your information when you use Schematic.
          </motion.p>
          <motion.p
            className="text-sm text-gray-500 dark:text-dark-textSecondary"
            variants={fadeUpVariants}
          >
            Last updated: 10/30/2025
          </motion.p>
        </motion.div>

        {/* Privacy Sections */}
        <motion.div
          className="space-y-12"
          variants={staggerVariants}
          initial="initial"
          animate="animate"
        >
          {privacySections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.section
                key={index}
                className="bg-white dark:bg-dark-paper rounded-2xl border border-gray-200 dark:border-dark-divider p-8 shadow-sm"
                variants={fadeUpVariants}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary">
                      {section.title}
                    </h2>
                  </div>
                </div>
                <ul className="space-y-4">
                  {section.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0 mt-2" />
                      <span className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            );
          })}
        </motion.div>

        {/* Additional Information */}
        <motion.section
          className="mt-16 bg-gray-50 dark:bg-dark-hover rounded-2xl p-8"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary mb-6">
            Contact Us
          </h2>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-dark-textSecondary">
              If you have any questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-600 dark:text-dark-textSecondary" />
              <a
                href="mailto:tanaynaik149@gmail.com"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                tanaynaik149@gmail.com
              </a>
            </div>
          </div>
        </motion.section>

        {/* Policy Updates */}
        <motion.section
          className="mt-12 text-center"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
        >
          <p className="text-sm text-gray-500 dark:text-dark-textSecondary">
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the "Last updated" date.
          </p>
        </motion.section>

        {/* Terms of Service Header */}
        <motion.div
          className="text-center py-16 space-y-6"
          variants={staggerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.h1
            className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-dark-textPrimary"
            variants={fadeUpVariants}
          >
            Terms of Service
          </motion.h1>
          <motion.p
            className="text-lg text-gray-600 dark:text-dark-textSecondary max-w-3xl mx-auto"
            variants={fadeUpVariants}
          >
            Please read these terms carefully. By using Schematic, you agree to
            the following terms and conditions.
          </motion.p>
          <motion.p
            className="text-sm text-gray-500 dark:text-dark-textSecondary"
            variants={fadeUpVariants}
          >
            Last updated: 10/30/2025
          </motion.p>
        </motion.div>

        {/* Terms of Service (Scrollable Section) */}
        <motion.section
          className="mt-16"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-dark-textPrimary mb-6">
            Terms of Service
          </h2>
          <div className="bg-white dark:bg-dark-paper rounded-2xl border border-gray-200 dark:border-dark-divider shadow-sm p-6">
            <div className="max-h-80 overflow-y-auto pr-2 space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  1. Acceptance of Terms
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  By accessing or using Schematic, you agree to be bound by
                  these Terms of Service. If you do not agree, you may not use
                  the Service.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  2. Use of the Service
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-dark-textSecondary">
                  <li>You must be at least 13 years old to use the Service.</li>
                  <li>
                    You are responsible for your account and for all activity
                    under it.
                  </li>
                  <li>
                    Do not misuse the Service, including attempting to disrupt
                    or access it using a method other than the provided
                    interfaces.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  3. Subscriptions and Billing
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  Certain features may require a paid subscription. Fees are
                  billed in advance and are non‑refundable except where required
                  by law.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  4. User Content
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  You retain ownership of your content. By using the Service,
                  you grant us a limited license to process and store your
                  content solely to operate and improve the Service, as
                  described in the Privacy Policy.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  5. Prohibited Conduct
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-dark-textSecondary">
                  <li>No unlawful, infringing, or harmful activity.</li>
                  <li>
                    No reverse engineering, scraping, or automated data
                    extraction without permission.
                  </li>
                  <li>
                    No uploading of malicious code or interference with Service
                    operations.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  6. Disclaimers and Limitation of Liability
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  The Service is provided "as is" without warranties of any
                  kind. To the fullest extent permitted by law, Schematic is not
                  liable for any indirect or consequential damages arising from
                  your use of the Service.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  7. Termination
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  We may suspend or terminate access if you violate these Terms.
                  You may stop using the Service at any time.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  8. Changes to These Terms
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  We may modify these Terms from time to time. Changes will be
                  effective when posted. Your continued use constitutes
                  acceptance.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-textPrimary mb-2">
                  9. Contact
                </h3>
                <p className="text-gray-700 dark:text-dark-textSecondary leading-relaxed">
                  Questions about these Terms? Contact us at
                  <a
                    href="mailto:tanaynaik149@gmail.com"
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    tanaynaik149@gmail.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </motion.section>
      </main>
    </motion.div>
  );
}
