"use client";

import WriteEditor from "@/app/write/_components/WriteEditor";
import { useState } from "react";
import WritePanel from "@/app/write/_components/WritePanel";
import { FileText } from "lucide-react";

export default function Writer() {
  const [input, setInput] = useState<string>("");

  return (
    <div className="flex w-full h-[125vh] bg-gray-200">
      <div className="flex w-full overflow-auto justify-center">
        <WriteEditor setInput={setInput} />
      </div>
      <WritePanel input={input} />
    </div>
  );
}
