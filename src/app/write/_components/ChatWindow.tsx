"use client";

import { useState } from "react";

export default function ChatWindow() {
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
    <div className="w-3/5 h-full flex flex-col items-center bg-white shadow-lg p-6 border border-gray-200">
      <h1 className="text-xl font-semibold text-gray-800">
        AI Writing Assistant V0
      </h1>
      <div className="w-full flex flex-col items-center mt-4 space-y-4">
        <p className="text-gray-600 text-sm">Paste your text below</p>
        <textarea
          className="w-full h-40 border border-gray-300 rounded-lg p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Start typing here..."
        ></textarea>
        <button
          type="submit"
          onClick={handleSubmit}
          className="bg-blue-500 text-white font-medium px-6 py-3 rounded-full shadow-md hover:bg-blue-600 transition duration-300"
        >
          Generate
        </button>
        <div className="w-full min-h-[100px] flex items-center justify-center border border-gray-300 bg-gray-50 text-gray-800 rounded-lg p-4 shadow-inner">
          {error ? (
            <span className="text-red-500">{error}</span>
          ) : (
            result || "Your generated text will appear here..."
          )}
        </div>
      </div>
    </div>
  );
}
