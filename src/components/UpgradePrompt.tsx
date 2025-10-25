"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface UpgradePromptProps {
  type: "documents" | "bulletins" | "premium-uses";
  currentCount?: number;
  limit?: number;
  onClose?: () => void;
  onUpgrade?: () => void;
}

export default function UpgradePrompt({
  type,
  currentCount,
  limit,
  onClose,
  onUpgrade,
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleUpgrade = async () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default behavior: redirect to settings
      window.location.href = "/settings?tab=subscription";
    }
  };

  if (!isVisible) return null;

  const messages = {
    documents: {
      title: "Document Limit Reached",
      description: `You've reached the free tier limit of ${limit} documents. Upgrade to premium for unlimited documents.`,
      features: [
        "Unlimited documents",
        "Unlimited notes",
        "150 premium AI requests per month",
      ],
    },
    bulletins: {
      title: "Note Limit Reached",
      description: `You've reached the free tier limit of ${limit} notes. Upgrade to premium for unlimited notes.`,
      features: [
        "Unlimited notes",
        "Unlimited documents",
        "150 premium AI requests per month",
      ],
    },
    "premium-uses": {
      title: "Premium AI Limit Reached",
      description: `You've used all your premium AI requests this week. Upgrade to premium for 150 monthly requests.`,
      features: [
        "150 premium AI requests per month",
        "Unlimited documents",
        "Unlimited notes",
      ],
    },
  };

  const message = messages[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-dark-secondary p-6 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-dark-textPrimary"
        >
          <X size={20} />
        </button>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-textPrimary">
            {message.title}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-dark-textSecondary">
            {message.description}
          </p>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-dark-textPrimary">
            Premium Features:
          </h3>
          <ul className="space-y-2">
            {message.features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center text-gray-700 dark:text-dark-textSecondary"
              >
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 dark:border-dark-divider px-4 py-2 text-gray-700 dark:text-dark-textSecondary hover:bg-gray-50 dark:hover:bg-dark-tertiary transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    </div>
  );
}
