"use client";

import ChatWindow from "@/app/write/_components/ChatWindow";
import WriteOptions from "@/app/write/_components/WriteOptions";
import { useState } from "react";

export default function Writer() {
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [continueEnabled, setContinueEnabled] = useState(false);

  return (
    <div className="flex w-full min-h-screen h-auto h-full p-2 bg-gray-200">
      <div className="w-1/5">
        <h1></h1>
      </div>
      <ChatWindow
        selectedContext={selectedContext}
        continueEnabled={continueEnabled}
      />
      <div className="flex w-1/5 justify-center items-center">
        <WriteOptions
          onSelectContext={setSelectedContext}
          setContinue={setContinueEnabled}
        />
      </div>
    </div>
  );
}
