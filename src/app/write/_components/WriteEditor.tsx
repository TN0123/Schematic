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
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
  const [pendingChanges, setPendingChanges] = useState<ChangeMap>({});
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [inputText, result]);

  useEffect(() => {
    if (changes && Object.keys(changes).length > 0) {
      setPendingChanges(changes);
    }
    if (!changes) {
      setPendingChanges({});
      setActiveHighlight(null);
    }
  }, [changes]);

  const combinedText = inputText + (result ? result : "");

  const handleContinue = async () => {
    try {
      setError("");
      setResult("Generating...");

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `${inputText}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }
      const data = await response.json();
      setResult(data.result || "No result generated.");
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
      updatedText = updatedText.replace(original, replacement);
    }
    setInputText(updatedText);
    setInput(updatedText);
    setPendingChanges({});
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
      `<mark class="bg-yellow-200">${highlight}</mark>`
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
      className={`w-full h-[125vh] flex items-center p-4 gap-2 ${
        Object.keys(pendingChanges).length != 0
          ? "justify-start"
          : "justify-center"
      }`}
    >
      <div className="w-5/6 h-full h-auto flex flex-col bg-white shadow-xl p-8 border border-gray-100">
        <div className="w-full flex flex-col gap-6 px-2">
          <div className="relative">
            <div className="w-full overflow-hidden min-h-48 p-6 text-gray-800 text-base leading-relaxed">
              <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none whitespace-pre-wrap p-6 text-base leading-relaxed text-transparent break-words"
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html: getHighlightedHTML(inputText, activeHighlight),
                }}
              />
              <div className="whitespace-pre-wrap text-white">
                {inputText}
                {result && (
                  <span className="bg-green-100 text-gray-800">{result}</span>
                )}
              </div>
              <textarea
                ref={textareaRef}
                className="w-full h-full absolute top-0 left-0 overflow-hidden p-6 text-gray-800 text-base leading-relaxed resize-none outline-none focus:ring-0 bg-transparent"
                value={combinedText}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (newValue.length < inputText.length) {
                    setInputText(newValue);
                    setResult("");
                  } else if (newValue.length < combinedText.length) {
                    setResult(newValue.slice(inputText.length));
                  } else {
                    setInputText(newValue);
                    setResult("");
                  }
                  setInput(newValue);
                  updateTextareaHeight();
                }}
                onInput={updateTextareaHeight}
                placeholder="Start typing here..."
              />
            </div>
          </div>
        </div>
      </div>
      {Object.keys(pendingChanges).length != 0 && activeHighlight == null && (
        <div className="w-2/6 h-3/4">
          <ChangeHandler
            changes={pendingChanges}
            applyChange={applyChange}
            rejectChange={rejectChange}
            acceptAllChanges={acceptAllChanges}
            setActiveHighlight={setActiveHighlight}
          />
        </div>
      )}
    </div>
  );
}
