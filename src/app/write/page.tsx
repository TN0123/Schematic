"use client";

import WriteEditor from "@/app/write/_components/WriteEditor";
import { useState, useEffect } from "react";
import WritePanel from "@/app/write/_components/WritePanel";
import { FileText } from "lucide-react";
import { ChangeMap } from "@/app/write/_components/WriteEditor";
import { useNextStep } from "nextstepjs";

export default function Writer() {
  const [input, setInput] = useState<string>("");
  const [changes, setChanges] = useState<ChangeMap>({});
  const [selected, setSelected] = useState<string>("");
  const { startNextStep } = useNextStep();
  const [lastRequest, setLastRequest] = useState<{
    input: string;
    selected: string;
    instructions: string;
    history: { role: "user" | "model"; parts: string }[];
  } | null>(null);

  useEffect(() => {
    async function checkAndStartTour() {
      try {
        const res = await fetch("/api/user/onboarding-status");
        const data = await res.json();

        if (!data.hasCompletedWriteTour) {
          startNextStep("writeTour");
        }
      } catch (error) {
        console.error("Failed to fetch onboarding status:", error);
      }
    }

    checkAndStartTour();
  }, [startNextStep]);

  return (
    <div className="flex w-full h-[90dvh] bg-gray-200 dark:bg-dark-secondary transition-all duration-200">
      <div className="flex w-full h-full overflow-auto justify-center">
        <WriteEditor
          setInput={setInput}
          changes={changes}
          setSelected={setSelected}
          onChangesAccepted={() => setLastRequest(null)}
        />
      </div>
      <WritePanel
        inputText={input}
        setChanges={setChanges}
        selected={selected}
        lastRequest={lastRequest}
        setLastRequest={setLastRequest}
      />
    </div>
  );
}
