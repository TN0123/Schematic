"use client";

import WriteEditor from "@/app/write/_components/WriteEditor";
import { useState } from "react";
import WritePanel from "@/app/write/_components/WritePanel";

export default function Writer() {
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [continueEnabled, setContinueEnabled] = useState(false);
  const [input, setInput] = useState<string>("");

  return (
    <div className="flex w-full h-[125vh] bg-gray-200">
      <div className="flex w-full overflow-auto p-2 justify-center">
        <WriteEditor
          selectedContext={selectedContext}
          continueEnabled={continueEnabled}
          setInput={setInput}
        />
      </div>
      <WritePanel
        onSelectContext={setSelectedContext}
        setContinue={setContinueEnabled}
        input={input}
      />
    </div>
  );
}
