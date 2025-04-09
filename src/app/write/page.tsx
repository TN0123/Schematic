"use client";

import WriteEditor from "@/app/write/_components/WriteEditor";
import { useState } from "react";
import WritePanel from "@/app/write/_components/WritePanel";
import { FileText } from "lucide-react";
import { ChangeMap } from "@/app/write/_components/WriteEditor";

export default function Writer() {
  const [input, setInput] = useState<string>("");
  const [changes, setChanges] = useState<ChangeMap>({});

  return (
    <div className="flex w-full h-full bg-gray-200">
      <div className="flex w-full overflow-auto justify-center">
        <WriteEditor setInput={setInput} changes={changes} />
      </div>
      <WritePanel inputText={input} setChanges={setChanges} />
    </div>
  );
}
