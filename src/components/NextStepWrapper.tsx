"use client";

import { NextStep } from "nextstepjs";
import { ReactNode } from "react";
import { steps } from "@/lib/nextstep-steps";
import CustomCard from "@/components/OnboardingCard";

export default function NextStepWrapper({ children }: { children: ReactNode }) {
  const handleTourComplete = async (tourName: string | null) => {
    if (!tourName) return;

    const tourKeyMap: Record<string, string> = {
      scheduleTour: "schedule",
      writeTour: "write",
    };

    const tourKey = tourKeyMap[tourName];
    if (!tourKey) return;

    try {
      await fetch("/api/user/complete-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourKey }),
      });
    } catch (error) {
      console.error(`Failed to mark ${tourKey} tour complete:`, error);
    }
  };

  const handleTourSkip = (step: number, tourName: string | null) => {
    handleTourComplete(tourName);
  };

  return (
    <NextStep
      steps={steps}
      onComplete={handleTourComplete}
      onSkip={handleTourSkip}
      cardComponent={CustomCard}
    >
      {children}
    </NextStep>
  );
}
