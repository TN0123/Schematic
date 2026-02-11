"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowUp,
  RefreshCw,
  UserPen,
  Eye,
  X,
  Calendar,
  CalendarPlus,
  Search,
  Brain,
  UserCog,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ToolCallData {
  name: string;
  description: string;
  notes?: Array<{
    id: string;
    title: string;
    type?: string;
  }>;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
  contextUpdated?: boolean;
  toolCalls?: ToolCallData[];
  contextChange?: {
    before: string;
    after: string;
  };
  isError?: boolean;
  isRetryable?: boolean;
  originalInput?: string;
}

interface DashboardChatProps {
  userId: string;
  onChatActiveChange?: (isActive: boolean) => void;
}

// Map tool names to icons and labels
const TOOL_META: Record<
  string,
  { icon: typeof Calendar; label: string; color: string }
> = {
  get_calendar_events: {
    icon: Calendar,
    label: "Calendar",
    color: "text-sky-400",
  },
  generate_calendar_events: {
    icon: CalendarPlus,
    label: "Create Events",
    color: "text-emerald-400",
  },
  search_bulletin_notes: {
    icon: Search,
    label: "Notes",
    color: "text-amber-400",
  },
  save_to_memory: {
    icon: Brain,
    label: "Memory",
    color: "text-violet-400",
  },
  update_user_profile: {
    icon: UserCog,
    label: "Profile",
    color: "text-rose-400",
  },
  search_memories: {
    icon: BookOpen,
    label: "Recall",
    color: "text-teal-400",
  },
};

// Tool call chip — extracted outside to avoid re-mount on parent re-renders
function ToolCallChip({
  toolCall,
  index,
  animate = true,
}: {
  toolCall: ToolCallData;
  index: number;
  animate?: boolean;
}) {
  const meta = TOOL_META[toolCall.name] || {
    icon: Eye,
    label: toolCall.name,
    color: "text-gray-400",
  };
  const Icon = meta.icon;

  const content = (
    <div className="group/chip inline-flex items-center gap-1.5 text-[11px] leading-tight px-2.5 py-1.5 rounded-lg bg-white/[0.04] dark:bg-white/[0.04] border border-white/[0.06] dark:border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.08] dark:hover:bg-white/[0.08] hover:border-white/[0.1] dark:hover:border-white/[0.1] transition-all duration-300 cursor-default">
      <Icon
        size={12}
        className={`${meta.color} flex-shrink-0 opacity-80 group-hover/chip:opacity-100 transition-opacity`}
      />
      <span className="text-gray-500 dark:text-white/50 group-hover/chip:text-gray-700 dark:group-hover/chip:text-white/70 transition-colors truncate max-w-[220px]">
        {toolCall.description}
      </span>
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.08,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {content}
    </motion.div>
  );
}

// Note link chip — extracted outside to prevent animation replay on parent re-renders
function NoteChip({
  note,
  index,
}: {
  note: { id: string; title: string; type?: string };
  index: number;
}) {
  return (
    <a
      href={`/bulletin?noteId=${note.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.06] dark:bg-emerald-400/[0.06] border border-emerald-500/[0.1] dark:border-emerald-400/[0.1] hover:bg-emerald-500/[0.12] dark:hover:bg-emerald-400/[0.12] hover:border-emerald-500/[0.2] dark:hover:border-emerald-400/[0.2] transition-all duration-300 group/note"
    >
      <BookOpen
        size={11}
        className="text-emerald-500 dark:text-emerald-400 opacity-70 group-hover/note:opacity-100 transition-opacity"
      />
      <span className="text-emerald-600 dark:text-emerald-300/80 group-hover/note:text-emerald-700 dark:group-hover/note:text-emerald-200 transition-colors">
        {note.title}
      </span>
    </a>
  );
}

// Markdown renderer config — stable reference outside component
const getMarkdownComponents = (isUser: boolean, isError: boolean) => ({
    p: (props: any) => (
      <p
        {...props}
        className={`mb-2 last:mb-0 leading-relaxed ${
          isError ? "text-red-700 dark:text-red-300" : ""
        }`}
      />
    ),
    ul: (props: any) => (
      <ul {...props} className="mb-2 last:mb-0 pl-4 space-y-0.5" />
    ),
    ol: (props: any) => (
      <ol {...props} className="mb-2 last:mb-0 pl-4 space-y-0.5" />
    ),
    li: (props: any) => <li {...props} className="mb-0.5" />,
    code: (props: any) => (
      <code
        {...props}
        className={`px-1.5 py-0.5 rounded-md text-[12px] font-mono ${
          isUser
            ? "bg-white/15 text-white/90"
            : "bg-gray-200/80 dark:bg-white/[0.08] text-gray-700 dark:text-white/80"
        }`}
      />
    ),
    pre: (props: any) => (
      <pre
        {...props}
        className={`p-3 rounded-lg text-[12px] overflow-x-auto font-mono ${
          isUser
            ? "bg-white/10"
            : "bg-gray-100 dark:bg-white/[0.04] border border-gray-200/50 dark:border-white/[0.06]"
        }`}
      />
    ),
    blockquote: (props: any) => (
      <blockquote
        {...props}
        className={`border-l-2 pl-3 italic opacity-80 ${
          isUser
            ? "border-white/30"
            : "border-gray-300 dark:border-white/20"
        }`}
      />
    ),
    a: (props: any) => (
      <a
        {...props}
        className="underline underline-offset-2 decoration-1 hover:decoration-2 transition-all"
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
    strong: (props: any) => (
      <strong {...props} className="font-semibold" />
    ),
});

export default function DashboardChat({
  userId,
  onChatActiveChange,
}: DashboardChatProps) {
  const { data: session } = useSession();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallData[]>(
    []
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [contextDiffModal, setContextDiffModal] = useState<{
    isOpen: boolean;
    before: string;
    after: string;
  }>({ isOpen: false, before: "", after: "" });
  const [assistantName, setAssistantName] = useState("");
  const [isLoadingName, setIsLoadingName] = useState(true);

  const isChatActive = chatMessages.length > 0;

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, streamingToolCalls]);

  // Fetch assistant name on mount
  useEffect(() => {
    const fetchAssistantName = async () => {
      try {
        const response = await fetch("/api/user/assistant-name");
        if (response.ok) {
          const data = await response.json();
          setAssistantName(data.assistantName);
        } else {
          setAssistantName("AI Life Assistant");
        }
      } catch (error) {
        console.error("Error fetching assistant name:", error);
        setAssistantName("AI Life Assistant");
      } finally {
        setIsLoadingName(false);
      }
    };
    fetchAssistantName();
  }, []);

  // Notify parent when chat becomes active/inactive
  const handleChatActiveChange = useCallback(
    (active: boolean) => {
      onChatActiveChange?.(active);
    },
    [onChatActiveChange]
  );

  useEffect(() => {
    handleChatActiveChange(isChatActive);
  }, [isChatActive, handleChatActiveChange]);

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: chatInput },
    ];
    setChatMessages(newMessages);
    const currentChatInput = chatInput;
    setChatInput("");
    setIsChatLoading(true);
    setStreamingToolCalls([]);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const goalsView = (
        typeof window !== "undefined"
          ? localStorage.getItem("goals-panel-active-tab")
          : null
      ) as "list" | "text" | "todo" | null;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          instructions: currentChatInput,
          history: chatMessages,
          userId,
          timezone: userTimezone,
          goalsView: goalsView || "list",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${res.status}: ${res.statusText}`
        );
      }

      // Read the SSE stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // Keep incomplete event in buffer

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "toolCall") {
              setStreamingToolCalls((prev) => [...prev, data.toolCall]);
            } else if (data.type === "done") {
              setChatMessages([
                ...newMessages,
                {
                  role: "model",
                  content: data.response,
                  contextUpdated: data.contextUpdated,
                  toolCalls: data.toolCalls,
                  contextChange: data.contextChange,
                },
              ]);
              setStreamingToolCalls([]);
            } else if (data.type === "error") {
              throw new Error(data.error);
            }
          } catch (parseError) {
            // Skip malformed events
            if (
              parseError instanceof Error &&
              parseError.message !== "No response stream"
            ) {
              console.warn("Failed to parse SSE event:", line);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);

      let errorMessage =
        "Sorry, I'm having trouble connecting. Please try again later.";
      let isRetryable = true;

      if (error instanceof Error) {
        if (
          error.message.includes("Missing instructions, userId, or timezone")
        ) {
          errorMessage =
            "There was a configuration error. Please refresh the page and try again.";
          isRetryable = false;
        } else if (error.message.includes("HTTP 500")) {
          errorMessage =
            "The AI service is temporarily unavailable. Please try again in a moment.";
        } else if (error.message.includes("HTTP 400")) {
          errorMessage =
            "There was an issue with your request. Please try rephrasing your message.";
        } else if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError")
        ) {
          errorMessage =
            "Network connection error. Please check your internet connection and try again.";
        }
      }

      setChatMessages([
        ...newMessages,
        {
          role: "model",
          content: errorMessage,
          isError: true,
          isRetryable,
          originalInput: currentChatInput,
        },
      ]);
      setStreamingToolCalls([]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRetryMessage = (originalInput: string) => {
    setChatInput(originalInput);
    setChatMessages((prev) => prev.slice(0, -1));
  };

  // Chat input component
  const renderChatInput = () => (
    <div className="relative group/input">
      <div className="flex items-center w-full px-4 sm:px-5 py-1 rounded-2xl bg-white/[0.03] dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.08] backdrop-blur-xl focus-within:border-gray-300 dark:focus-within:border-white/[0.16] focus-within:bg-white/[0.05] dark:focus-within:bg-white/[0.05] transition-all duration-500 ease-out">
        <textarea
          ref={inputRef}
          className="flex-1 py-2.5 sm:py-3 resize-none bg-transparent focus:outline-none text-gray-800 dark:text-white/90 text-[13px] sm:text-sm placeholder-gray-400 dark:placeholder-white/25 leading-relaxed"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleChatSubmit();
            }
          }}
          placeholder="Ask anything..."
          rows={1}
          disabled={isChatLoading}
          style={{ minHeight: "40px", maxHeight: "200px" }}
        />
        <div className="flex items-center ml-2">
          <button
            className={`p-1.5 sm:p-2 rounded-xl transition-all duration-300 flex items-center justify-center active:scale-90 ${
              chatInput.trim()
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg shadow-black/10 dark:shadow-white/10 hover:shadow-xl hover:shadow-black/15 dark:hover:shadow-white/15"
                : "text-gray-300 dark:text-white/20"
            }`}
            onClick={handleChatSubmit}
            disabled={isChatLoading || !chatInput.trim()}
            title="Send message"
          >
            <ArrowUp size={16} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        {/* Input when no messages */}
        {chatMessages.length === 0 && (
          <div className="mb-4 sm:mb-8 flex-shrink-0 animate-fade-in">
            {renderChatInput()}
          </div>
        )}

        {/* Chat Thread */}
        <AnimatePresence mode="wait">
          {chatMessages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col"
            >
              <div
                ref={chatContainerRef}
                className="space-y-5 overflow-y-auto pb-4 max-h-[60vh] scroll-smooth chat-scrollbar"
              >
                <AnimatePresence mode="popLayout">
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{
                        duration: 0.3,
                        ease: [0.23, 1, 0.32, 1],
                        layout: {
                          type: "spring",
                          bounce: 0.1,
                          duration: 0.4,
                        },
                      }}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "user" ? (
                        /* User message */
                        <div className="max-w-[85%] sm:max-w-md">
                          <div className="px-4 py-2.5 rounded-2xl rounded-br-lg bg-gray-900 dark:bg-white/[0.1] text-white dark:text-white/90 border border-gray-800 dark:border-white/[0.08]">
                            <div className="text-[13px] sm:text-sm leading-relaxed">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={getMarkdownComponents(true, false)}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Assistant message */
                        <div className="max-w-[90%] sm:max-w-lg space-y-2.5">
                          {/* Tool calls */}
                          {message.toolCalls &&
                            message.toolCalls.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {message.toolCalls.map(
                                  (toolCall, toolIndex) => (
                                    <div
                                      key={toolIndex}
                                      className="flex flex-col gap-1.5"
                                    >
                                      <ToolCallChip
                                        toolCall={toolCall}
                                        index={toolIndex}
                                        animate={false}
                                      />
                                      {toolCall.name ===
                                        "search_bulletin_notes" &&
                                        toolCall.notes &&
                                        toolCall.notes.length > 0 && (
                                          <div className="flex flex-wrap gap-1 ml-1">
                                            {toolCall.notes.map(
                                              (note, noteIndex) => (
                                                <NoteChip
                                                  key={noteIndex}
                                                  note={note}
                                                  index={noteIndex}
                                                />
                                              )
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                          {/* Message content */}
                          <div
                            className={`text-[13px] sm:text-sm leading-relaxed ${
                              message.isError
                                ? "px-3.5 py-2.5 rounded-2xl rounded-tl-lg bg-red-50/80 dark:bg-red-500/[0.06] border border-red-200/60 dark:border-red-400/[0.1]"
                                : "text-gray-800 dark:text-white/85"
                            }`}
                          >
                            <div className="prose dark:prose-invert prose-sm max-w-none prose-p:text-[13px] sm:prose-p:text-sm prose-p:leading-relaxed">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={getMarkdownComponents(
                                  false,
                                  !!message.isError
                                )}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Error retry */}
                          {message.isError &&
                            message.isRetryable &&
                            message.originalInput && (
                              <motion.button
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                onClick={() =>
                                  handleRetryMessage(message.originalInput!)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-100/60 dark:bg-red-500/[0.08] hover:bg-red-100 dark:hover:bg-red-500/[0.14] border border-red-200/60 dark:border-red-400/[0.12] rounded-lg transition-all duration-300"
                              >
                                <RefreshCw size={11} />
                                Retry
                              </motion.button>
                            )}

                          {/* Context updated indicator */}
                          {message.contextUpdated && (
                            <motion.button
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition-colors duration-300 cursor-pointer"
                              title="Click to see context changes"
                              onClick={() => {
                                if (message.contextChange) {
                                  setContextDiffModal({
                                    isOpen: true,
                                    before: message.contextChange.before,
                                    after: message.contextChange.after,
                                  });
                                }
                              }}
                            >
                              <UserPen size={11} />
                              <span>Context Updated</span>
                            </motion.button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Streaming tool calls + loading */}
                <AnimatePresence>
                  {isChatLoading && (
                    <motion.div
                      className="flex justify-start"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    >
                      <div className="space-y-2.5 max-w-[90%] sm:max-w-lg">
                        {/* Streaming tool calls appear here */}
                        {streamingToolCalls.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {streamingToolCalls.map((toolCall, i) => (
                              <ToolCallChip
                                key={i}
                                toolCall={toolCall}
                                index={i}
                                animate={true}
                              />
                            ))}
                          </div>
                        )}

                        {/* Thinking indicator */}
                        <div className="flex items-center gap-2">
                          <div className="thinking-shimmer">
                            <div className="shimmer-bar" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input at bottom when messages exist */}
              <div className="mt-4 flex-shrink-0">{renderChatInput()}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context Diff Modal */}
      <AnimatePresence>
        {contextDiffModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-2 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setContextDiffModal({ isOpen: false, before: "", after: "" });
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl dark:shadow-black/50 max-w-4xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden border border-gray-200/60 dark:border-white/[0.08]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white/90 tracking-tight">
                  Context Changes
                </h2>
                <button
                  onClick={() =>
                    setContextDiffModal({
                      isOpen: false,
                      before: "",
                      after: "",
                    })
                  }
                  className="p-1.5 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all duration-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(80vh-180px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white/80 mb-2 sm:mb-3 flex items-center text-sm gap-2">
                      <span className="w-2 h-2 bg-red-400 rounded-full" />
                      Before
                    </h3>
                    <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-gray-600 dark:text-white/60 whitespace-pre-wrap min-h-[150px] sm:min-h-[200px] max-h-[calc(90vh-200px)] sm:max-h-[calc(80vh-260px)] overflow-y-auto border border-gray-100 dark:border-white/[0.06] font-mono leading-relaxed">
                      {contextDiffModal.before || "No previous context"}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white/80 mb-2 sm:mb-3 flex items-center text-sm gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                      After
                    </h3>
                    <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-gray-600 dark:text-white/60 whitespace-pre-wrap min-h-[150px] sm:min-h-[200px] max-h-[calc(90vh-200px)] sm:max-h-[calc(80vh-260px)] overflow-y-auto border border-gray-100 dark:border-white/[0.06] font-mono leading-relaxed">
                      {contextDiffModal.after}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/[0.06] gap-2 sm:gap-2.5">
                <button
                  onClick={() =>
                    setContextDiffModal({
                      isOpen: false,
                      before: "",
                      after: "",
                    })
                  }
                  className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-white/60 bg-gray-100/80 dark:bg-white/[0.06] hover:bg-gray-200/80 dark:hover:bg-white/[0.1] border border-gray-200/60 dark:border-white/[0.06] transition-all duration-200"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/schedule/context", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId,
                          context: contextDiffModal.before,
                        }),
                      });
                      if (!response.ok) {
                        throw new Error("Failed to revert schedule context");
                      }
                      setContextDiffModal({
                        isOpen: false,
                        before: "",
                        after: "",
                      });
                    } catch (error) {
                      console.error(
                        "Failed to revert schedule context",
                        error
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-sm text-white bg-red-500 hover:bg-red-600 dark:bg-red-500/90 dark:hover:bg-red-500 border border-red-600/20 shadow-sm shadow-red-500/10 transition-all duration-200"
                >
                  Reject Change
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles */}
      <style jsx global>{`
        .thinking-shimmer {
          width: 48px;
          height: 3px;
          border-radius: 2px;
          overflow: hidden;
          background: rgba(150, 150, 150, 0.1);
        }
        .dark .thinking-shimmer {
          background: rgba(255, 255, 255, 0.04);
        }
        .shimmer-bar {
          width: 100%;
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(120, 120, 120, 0.4) 50%,
            transparent 100%
          );
          animation: shimmer 1.8s ease-in-out infinite;
        }
        .dark .shimmer-bar {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.25) 50%,
            transparent 100%
          );
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .chat-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .chat-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(150, 150, 150, 0.15);
          border-radius: 2px;
        }
        .dark .chat-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
        }
        .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(150, 150, 150, 0.3);
        }
        .dark .chat-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </>
  );
}
