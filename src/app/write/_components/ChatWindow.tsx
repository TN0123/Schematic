"use client";

import { useState, useEffect } from "react";

export default function ChatWindow({
  selectedContext,
  continueEnabled,
}: {
  selectedContext: string;
  continueEnabled: boolean;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [inputText, setInputText] = useState("");

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

  return (
    <div className="w-3/5 min-h-full h-auto flex flex-col bg-white shadow-xl p-8 border border-gray-100">
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

      <div className="w-full flex flex-col gap-6">
        <div className="relative">
          <textarea
            className="w-full overflow-hidden bg-gray-50 min-h-48 rounded-xl p-6 text-gray-800 text-base leading-relaxed resize-none border-0 outline-none focus:ring-0 focus:bg-white transition-all duration-300"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
            placeholder="Start typing here..."
          ></textarea>
          <div className="absolute bottom-4 right-4 text-xs text-gray-400">
            {inputText.length} characters
          </div>
        </div>
        {selectedContext && (
          <p className="text-gray-500 text-sm">Context: {selectedContext}</p>
        )}
        <div
          className={`w-full min-h-[160px] rounded-xl p-6 ${
            error ? "bg-red-50" : result ? "bg-blue-50" : "bg-gray-50"
          } transition-colors duration-200`}
        >
          <div className="h-full flex items-center justify-center">
            {error ? (
              <span className="text-red-500 font-medium">{error}</span>
            ) : (
              <span className="text-gray-700 leading-relaxed">
                {result || "Your generated content will appear here..."}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
