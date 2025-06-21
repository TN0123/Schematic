"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";

export interface DetailedError {
  message: string;
  details?: string;
  code?: string;
  suggestions?: string[];
  technicalInfo?: {
    endpoint?: string;
    timestamp?: string;
    requestId?: string;
    aiModel?: string;
    validationErrors?: string[];
  };
}

interface DetailedErrorDisplayProps {
  error: DetailedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function DetailedErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = "",
}: DetailedErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyError = async () => {
    const errorInfo = {
      message: error.message,
      details: error.details,
      code: error.code,
      technicalInfo: error.technicalInfo,
      timestamp: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error info:", err);
    }
  };

  return (
    <div
      className={`border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}
    >
      {/* Main Error Message */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-200">
                  {error.message}
                </p>
                {error.details && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {error.details}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions */}
            {error.suggestions && error.suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Suggestions:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 dark:text-red-400 mt-0.5">
                        •
                      </span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Expandable Technical Details */}
            {(error.code || error.technicalInfo) && (
              <div className="mt-3">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Technical Details
                </button>

                {isExpanded && (
                  <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg border border-red-200 dark:border-red-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Error Information
                      </h4>
                      <button
                        onClick={handleCopyError}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      {error.code && (
                        <div>
                          <span className="font-medium text-red-700 dark:text-red-300">
                            Error Code:
                          </span>
                          <span className="ml-2 font-mono text-red-600 dark:text-red-400">
                            {error.code}
                          </span>
                        </div>
                      )}

                      {error.technicalInfo?.endpoint && (
                        <div>
                          <span className="font-medium text-red-700 dark:text-red-300">
                            Endpoint:
                          </span>
                          <span className="ml-2 font-mono text-red-600 dark:text-red-400">
                            {error.technicalInfo.endpoint}
                          </span>
                        </div>
                      )}

                      {error.technicalInfo?.aiModel && (
                        <div>
                          <span className="font-medium text-red-700 dark:text-red-300">
                            AI Model:
                          </span>
                          <span className="ml-2 font-mono text-red-600 dark:text-red-400">
                            {error.technicalInfo.aiModel}
                          </span>
                        </div>
                      )}

                      {error.technicalInfo?.timestamp && (
                        <div>
                          <span className="font-medium text-red-700 dark:text-red-300">
                            Timestamp:
                          </span>
                          <span className="ml-2 font-mono text-red-600 dark:text-red-400">
                            {new Date(
                              error.technicalInfo.timestamp
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {error.technicalInfo?.requestId && (
                        <div>
                          <span className="font-medium text-red-700 dark:text-red-300">
                            Request ID:
                          </span>
                          <span className="ml-2 font-mono text-red-600 dark:text-red-400">
                            {error.technicalInfo.requestId}
                          </span>
                        </div>
                      )}

                      {error.technicalInfo?.validationErrors &&
                        error.technicalInfo.validationErrors.length > 0 && (
                          <div>
                            <span className="font-medium text-red-700 dark:text-red-300 block mb-1">
                              Validation Errors:
                            </span>
                            <ul className="space-y-1 ml-2">
                              {error.technicalInfo.validationErrors.map(
                                (validationError, index) => (
                                  <li
                                    key={index}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    • {validationError}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
