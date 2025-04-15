"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChangeHandler } from "./ChangeHandler";

export type ChangeMap = Record<string, string>;

export default function WriteEditor({
  setInput,
  changes,
}: {
  setInput: (input: string) => void;
  changes: any;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [pendingChanges, setPendingChanges] = useState<ChangeMap>({});
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [generatedStart, setGeneratedStart] = useState<number | null>(null);
  const [generatedEnd, setGeneratedEnd] = useState<number | null>(null);

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
    }
  }, [pendingChanges]);

  useEffect(() => {
    if (loading) {
      setInputText(inputText + " Generating...");
    }
  }, [loading]);

  const handleContinue = async () => {
    try {
      setError("");
      setLoading(true);

      const textBeforeCursor = inputText.slice(0, cursorPosition);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startText: `${textBeforeCursor}`,
          endText: `${inputText.slice(cursorPosition)}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }
      const data = await response.json();
      const generatedText = data.result || "";

      const before = inputText.slice(0, cursorPosition);
      const after = inputText.slice(cursorPosition);
      const updated = before + generatedText + after;

      const start = before.length;
      const end = start + generatedText.length;

      setGeneratedStart(start);
      setGeneratedEnd(end);
      setInputText(updated);
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
        console.log("continuing writing...");
      }
    },
    [handleContinue]
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
      `<mark class="bg-yellow-200 dark:bg-yellow-900 dark:text-gray-200">${highlight}</mark>`
    );
  };

  const getHighlightedHTMLWithRange = (
    text: string,
    start: number | null,
    end: number | null
  ): string => {
    if (start === null || end === null) return text;

    const before = text.slice(0, start);
    const highlight = text.slice(start, end);
    const after = text.slice(end);

    return (
      before +
      `<mark class="bg-green-100 text-gray-800 dark:text-gray-200 dark:bg-green-900">${highlight}</mark>` +
      after
    );
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  useEffect(() => {
    console.log("Pending changes:", pendingChanges);
  }, [pendingChanges]);

  return (
    <div
      className={`w-full h-[92.25vh] flex items-center p-4 pb-0 gap-2 ${
        Object.keys(pendingChanges).length != 0
          ? "justify-start"
          : "justify-center"
      }`}
    >
      <div className="w-[925px] h-full overflow-y-scroll flex flex-col bg-white dark:bg-gray-900 shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-all duration-200">
        <div className="w-full flex flex-col gap-6 px-2">
          <div className="relative">
            <div className="w-full overflow-hidden min-h-48 p-6 text-gray-800 dark:text-gray-200 text-base leading-relaxed">
              <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none whitespace-pre-wrap p-6 text-base leading-relaxed text-transparent break-words"
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html:
                    activeHighlight !== null
                      ? getHighlightedHTML(inputText, activeHighlight)
                      : getHighlightedHTMLWithRange(
                          inputText,
                          generatedStart,
                          generatedEnd
                        ),
                }}
              />
              <textarea
                ref={textareaRef}
                className="w-full h-full absolute top-0 left-0 overflow-hidden p-6 text-gray-800 dark:text-gray-200 text-base leading-relaxed resize-none outline-none focus:ring-0 bg-transparent"
                value={inputText}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const selectionStart = e.target.selectionStart ?? 0;
                  setCursorPosition(selectionStart);
                  setInput(newValue);
                  setInputText(newValue);
                  setGeneratedStart(null);
                  setGeneratedEnd(null);
                  updateTextareaHeight();
                }}
                onSelect={(e) => {
                  setCursorPosition(e.currentTarget.selectionStart ?? 0);
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
          setActiveHighlight={setActiveHighlight}
        />
      </div>
    </div>
  );
}
