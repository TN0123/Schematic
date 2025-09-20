"use client";

import { NextStep } from "nextstepjs";
import { ReactNode, useMemo } from "react";
import { steps } from "@/lib/nextstep-steps";
import CustomCard from "@/components/OnboardingCard";
import { useIsMobile, useModifierKeyLabel } from "@/components/utils/platform";

export default function NextStepWrapper({ children }: { children: ReactNode }) {
  const modKeyLabel = useModifierKeyLabel();
  const isMobile = useIsMobile();

  const resolvedSteps = useMemo(() => {
    return steps.map((tour) => ({
      ...tour,
      steps: tour.steps.map((s) => ({
        ...s,
        content:
          typeof s.content === "string"
            ? s.content.replace(/Ctrl\+/g, `${modKeyLabel}+`)
            : s.content,
      })),
    }));
  }, [modKeyLabel]);
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

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <NextStep
      steps={resolvedSteps}
      onComplete={handleTourComplete}
      onSkip={handleTourSkip}
      cardComponent={CustomCard}
    >
      {children}
    </NextStep>
  );
}
