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
    <div className="m-2 w-3/4 h-full flex flex-col items-center justify-center bg-gray-100 rounded-md">
      <h1 className="p-2 rounded-md">AI Writing Assistant V0</h1>
      <div className="w-full h-full border-gray-200 p-2 flex items-center justify center flex-col">
        <p>paste your text below</p>
        <textarea
          className="text-black w-3/4 h-1/2 rounded-lg my-2 p-4"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        ></textarea>
        <button
          type="submit"
          onClick={handleSubmit}
          className="bg-blue-500 rounded-full p-2"
        >
          Generate
        </button>
        <p className="h-1/2 w-3/4 flex items-center justify-center text-black bg-white rounded-lg my-2 p-4">
          {error ? <span className="text-red-500">{error}</span> : result}
        </p>
      </div>
    </div>
  );
}
