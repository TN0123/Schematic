"use client";

import { useState, useEffect, useRef } from "react";

export default function WriteEditor({
  selectedContext,
  continueEnabled,
  setInput,
}: {
  selectedContext: string;
  continueEnabled: boolean;
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

  const handleSubmit = async () => {
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
          context: selectedContext,
          continueEnabled: continueEnabled,
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

  const combinedText = inputText + (result ? result : "");

  return (
    <div className="w-5/6 min-h-full h-auto flex flex-col bg-white shadow-xl p-8 border border-gray-100">
      <div className="flex justify-between items-center mb-8">
        <div className="flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            AI Writing Assistant
          </h1>
          <p className="text-gray-500 text-sm">
            Transform your ideas into polished content
          </p>
        </div>

        <button
          type="submit"
          onClick={handleSubmit}
          className="self-center px-6 py-2.5 bg-white text-gray-800 font-medium rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 hover:translate-y-[-1px] active:translate-y-[1px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          Generate Content
        </button>
      </div>

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
        {selectedContext && (
          <p className="text-gray-500 text-sm">Context: {selectedContext}</p>
        )}
      </div>
    </div>
  );
}
