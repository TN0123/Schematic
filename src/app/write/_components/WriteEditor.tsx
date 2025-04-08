"use client";

import { FileText } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

export default function WriteEditor({
  setInput,
}: {
  setInput: (input: string) => void;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");
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

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div className="w-full h-full flex flex-col items-center p-4">
      <div className="w-5/6 min-h-full h-auto flex flex-col bg-white shadow-xl p-8 border border-gray-100">
        <div className="w-full flex flex-col gap-6 px-2">
          <div className="relative">
            <div className="w-full overflow-hidden min-h-48 rounded-xl p-6 text-gray-800 text-base leading-relaxed">
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
    </div>
  );
}
