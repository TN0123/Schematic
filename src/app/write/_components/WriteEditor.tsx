"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChangeHandler } from "./ChangeHandler";
import { Info, FileUp, FileText, Loader2, ArrowLeft } from "lucide-react";
import jsPDF from "jspdf";
import { useDebouncedCallback } from "use-debounce";
import Link from "next/link";

export type ChangeMap = Record<string, string>;

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  userId: string;
}

export default function WriteEditor({
  setInput,
  changes,
  setSelected,
  onChangesAccepted,
  userId,
  premiumRemainingUses,
  setPremiumRemainingUses,
  selectedModel,
  currentDocument,
  onSaveDocument,
  isSaving,
}: {
  setInput: (input: string) => void;
  changes: any;
  setSelected: (selected: string) => void;
  onChangesAccepted: () => void;
  userId?: string;
  premiumRemainingUses: number | null;
  setPremiumRemainingUses: (remainingUses: number) => void;
  selectedModel: "auto" | "basic" | "premium";
  currentDocument: Document | null;
  onSaveDocument: () => void;
  isSaving: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [pendingChanges, setPendingChanges] = useState<ChangeMap>({});
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const [generatedStart, setGeneratedStart] = useState<number | null>(null);
  const [generatedEnd, setGeneratedEnd] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [title, setTitle] = useState(
    currentDocument?.title || "Untitled Document"
  );

  // Debounced save for content
  const debouncedSaveContent = useDebouncedCallback((newContent: string) => {
    if (currentDocument && newContent !== currentDocument.content) {
      setIsSavingContent(true);
      // Call onSaveDocument to trigger the save
      onSaveDocument();
      // Reset saving indicator after a short delay
      setTimeout(() => setIsSavingContent(false), 500);
    }
  }, 1000);

  // Add effect to sync input with document content
  useEffect(() => {
    if (currentDocument) {
      setInputText(currentDocument.content);
    }
  }, [currentDocument?.content]);

  const updateTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    updateTextareaHeight();
  }, [inputText]);

  useEffect(() => {
    if (changes && Object.keys(changes).length > 0) {
      setPendingChanges(changes);
    }
  }, [changes]);

  useEffect(() => {
    if (Object.keys(pendingChanges).length === 0) {
      setActiveHighlight(null);
      onChangesAccepted();
    }
  }, [pendingChanges]);

  useEffect(() => {
    setTitle(currentDocument?.title || "Untitled Document");
  }, [currentDocument?.title]);

  // Debounced save for title
  const debouncedSaveTitle = useDebouncedCallback((newTitle: string) => {
    if (currentDocument && newTitle !== currentDocument.title) {
      // Update the document with new title
      currentDocument.title = newTitle;
      onSaveDocument();
    }
  }, 800);

  const handleContinue = async () => {
    try {
      setUndoStack((prev) => {
        const newStack = [...prev, inputText];
        return newStack.length > 10 ? newStack.slice(-10) : newStack;
      });
      setError("");
      const liveCursor =
        textareaRef.current?.selectionStart ?? inputText.length;

      cursorPositionRef.current = liveCursor;

      const before = inputText.slice(0, cursorPositionRef.current);
      const after = inputText.slice(cursorPositionRef.current);

      cursorPositionRef.current = liveCursor;
      setLoading(true);
      setSelectionStart(null);
      setSelectionEnd(null);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startText: `${before}`,
          endText: `${after}`,
          userId,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }
      const data = await response.json();

      const { text: generatedText, remainingUses } = data.result;

      const updated = before + generatedText + after;

      const start = before.length;
      const end = start + generatedText.length;

      setInputText(updated);
      cursorPositionRef.current = end;

      setGeneratedStart(start);
      setGeneratedEnd(end);

      // Update remaining uses if provided
      if (remainingUses !== null) {
        setPremiumRemainingUses(remainingUses);
      }

      setLoading(false);
    } catch (error) {
      console.error(error);
      setError("An error occurred while generating content.");
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        handleContinue();
      }

      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (undoStack.length > 0) {
          const last = undoStack[undoStack.length - 1];
          setInputText(last);
          setInput(last);
          setUndoStack((prev) => prev.slice(0, prev.length - 1));
          setGeneratedStart(null);
          setGeneratedEnd(null);
          console.log("undo last generation");
        }
      }
    },
    [handleContinue, undoStack, setInput]
  );

  const applyChange = (original: string, replacement: string) => {
    const updated = inputText.replace(original, replacement);
    setInputText(updated);
    setInput(updated);
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges[original];
    setPendingChanges(updatedChanges);
  };

  const rejectChange = (original: string) => {
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges[original];
    setPendingChanges(updatedChanges);
  };

  const acceptAllChanges = () => {
    let updatedText = inputText;
    for (const [original, replacement] of Object.entries(pendingChanges)) {
      if (original === "!ADD_TO_END!") {
        updatedText += replacement;
      } else {
        updatedText = updatedText.replace(original, replacement);
      }
    }
    setInputText(updatedText);
    setInput(updatedText);
    setPendingChanges({});
  };

  const rejectAllChanges = () => {
    setPendingChanges({});
  };

  const handleExport = () => {
    if (!inputText.trim()) {
      alert("Please add some content before exporting.");
      return;
    }

    try {
      // Create new PDF document
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Set up Google Docs-style formatting
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 25.4; // 1 inch margins like Google Docs
      const lineHeight = 6; // Line spacing
      const fontSize = 11; // Standard document font size

      pdf.setFont("times", "normal");
      pdf.setFontSize(fontSize);

      // Split text into lines that fit within margins
      const maxWidth = pageWidth - margin * 2;
      const lines = pdf.splitTextToSize(inputText, maxWidth);

      let yPosition = margin;
      let currentPage = 1;

      // Add lines to PDF, handling page breaks
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (yPosition + lineHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          currentPage++;
        }

        pdf.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, "");
      const filename = `document_${timestamp}.pdf`;

      // Download the PDF
      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    }
  };

  const appendChange = (newText: string) => {
    const updatedText = inputText + newText;
    setInputText(updatedText);
    setInput(updatedText);
    const updatedChanges = { ...pendingChanges };
    delete updatedChanges["!ADD_TO_END!"];
    setPendingChanges(updatedChanges);
  };

  const getHighlightedHTML = (
    text: string,
    highlight: string | null
  ): string => {
    if (!highlight) return text;
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    return text.replace(
      regex,
      `<mark class="bg-yellow-200 dark:bg-yellow-900 dark:text-dark-textPrimary">${highlight}</mark>`
    );
  };

  const getHighlightedHTMLWithRange = (
    text: string,
    start: number | null,
    end: number | null,
    variant: "selection" | "generated" = "generated",
    highlightText?: string
  ): string => {
    if ((start === null || end === null || start === end) && !highlightText)
      return text;

    const highlightClass =
      variant === "selection"
        ? "bg-purple-100 dark:bg-purple-900 dark:text-dark-textPrimary"
        : "bg-green-100 text-gray-800 dark:text-dark-textPrimary dark:bg-green-900";

    const before = text.slice(0, start!);
    const highlight = text.slice(start!, end!);
    const after = text.slice(end!);

    return (
      before + `<mark class="${highlightClass}">${highlight}</mark>` + after
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart ?? 0;
    cursorPositionRef.current = cursorPos;
    setInput(newValue);
    setInputText(newValue);
    debouncedSaveContent(newValue);
    setGeneratedStart(null);
    setGeneratedEnd(null);
    updateTextareaHeight();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    if (
      textareaRef.current &&
      generatedStart !== null &&
      generatedEnd !== null
    ) {
      textareaRef.current.selectionStart = generatedEnd;
      textareaRef.current.selectionEnd = generatedEnd;
      textareaRef.current.focus();
    }
  }, [inputText, generatedStart, generatedEnd]);

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <div className="w-[925px] flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/write"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700/50 shadow-sm hover:shadow-md hover:from-purple-100 hover:to-indigo-100 dark:hover:from-purple-800/30 dark:hover:to-indigo-800/30 text-sm font-medium text-purple-700 dark:text-purple-200 transition-all duration-200 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Documents
          </Link>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 dark:text-gray-400" />
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                debouncedSaveTitle(e.target.value);
              }}
              className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-dark-textPrimary"
              placeholder="Untitled Document"
            />
            {(isSaving || isSavingContent) && (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            )}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center bg-gray-50 dark:bg-dark-secondary gap-2 px-4 py-2 text-xs border border-gray-200 dark:border-dark-divider rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all duration-200 font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md"
        >
          Export
          <FileUp className="w-4 h-4" />
        </button>
      </div>
      <div
        className={`w-full h-full flex items-center px-4 gap-2 ${
          Object.keys(pendingChanges).length != 0
            ? "justify-start"
            : "justify-center"
        }`}
      >
        <div
          className="w-[925px] h-full overflow-y-scroll flex flex-col bg-white dark:bg-neutral-900 shadow-xl p-8 border border-gray-100 dark:border-dark-divider transition-all duration-200"
          id="write-editor"
        >
          <div className="w-full flex flex-col gap-6 px-2">
            <div className="relative">
              <div className="w-full overflow-hidden min-h-48 p-6 text-gray-800 dark:text-dark-textPrimary text-base leading-relaxed">
                <div
                  className="absolute top-0 left-0 w-full h-full pointer-events-none whitespace-pre-wrap p-6 text-base leading-relaxed text-transparent break-words"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{
                    __html:
                      activeHighlight !== null
                        ? getHighlightedHTML(inputText, activeHighlight)
                        : selectionStart !== null && selectionEnd !== null
                        ? getHighlightedHTMLWithRange(
                            inputText,
                            selectionStart,
                            selectionEnd,
                            "selection"
                          )
                        : getHighlightedHTMLWithRange(
                            inputText,
                            generatedStart,
                            generatedEnd,
                            "generated"
                          ),
                  }}
                />
                <div className="absolute top-0 left-4 flex flex-col items-start gap-2 z-10">
                  {selectedModel !== "basic" &&
                    premiumRemainingUses !== null &&
                    userId !== "cm6qw1jxy0000unao2h2rz83l" &&
                    userId !== "cma8kzffi0000unysbz2awbmf" && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 group relative">
                        <Info className="w-3 h-3 cursor-help" />
                        Premium model uses remaining: {premiumRemainingUses}
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                          The premium model is used for both Ctrl+Enter
                          generation and AI sidebar suggestions. If you have 0
                          premium uses left, the system will automatically
                          switch to the default model.
                        </div>
                      </div>
                    )}
                  {selectedModel !== "basic" &&
                    (userId === "cm6qw1jxy0000unao2h2rz83l" ||
                      userId === "cma8kzffi0000unysbz2awbmf") && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 group relative">
                        <Info className="w-3 h-3 cursor-help" />
                        Premium model active
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-white dark:bg-neutral-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                          The premium model is used for both Ctrl+Enter
                          generation and AI sidebar suggestions. You are a
                          premium user with unlimited uses.
                        </div>
                      </div>
                    )}
                </div>
                <div className="absolute top-0 right-4 flex flex-col items-end gap-2 z-10">
                  {loading && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Generating...
                    </div>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  id="write-editor"
                  className="w-full h-full absolute top-0 left-0 overflow-hidden p-6 text-gray-800 dark:text-dark-textPrimary text-base leading-relaxed resize-none outline-none focus:ring-0 bg-transparent"
                  value={inputText}
                  onChange={handleTextChange}
                  onSelect={(e) => {
                    const textarea = e.currentTarget;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;

                    cursorPositionRef.current = start;
                    setSelectionStart(start);
                    setSelectionEnd(end);

                    const selected = textarea.value.substring(start, end);
                    setSelected(selected);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const textarea = textareaRef.current;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const newValue =
                          inputText.substring(0, start) +
                          "\t" +
                          inputText.substring(end);
                        setInputText(newValue);
                        setInput(newValue);
                        cursorPositionRef.current = start + 1;
                        setTimeout(() => {
                          textarea.selectionStart = textarea.selectionEnd =
                            start + 1;
                        }, 0);
                      }
                    }
                  }}
                  onInput={updateTextareaHeight}
                  placeholder="Start typing here..."
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            Object.keys(pendingChanges).length !== 0 &&
            Object.keys(pendingChanges)[0] !== ""
              ? "w-2/6 opacity-100 translate-x-0"
              : "w-0 opacity-0 -translate-x-10"
          } h-3/4 self-start`}
        >
          <ChangeHandler
            changes={pendingChanges}
            applyChange={applyChange}
            rejectChange={rejectChange}
            appendChange={appendChange}
            acceptAllChanges={acceptAllChanges}
            rejectAllChanges={rejectAllChanges}
            setActiveHighlight={setActiveHighlight}
          />
        </div>
      </div>
    </div>
  );
}
