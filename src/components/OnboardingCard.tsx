"use client";

import React from "react";
import { Step } from "nextstepjs";
import type { CardComponentProps } from "nextstepjs";

const CustomCard = ({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) => {
  return (
    <div className="min-w-[300px] bg-white dark:bg-dark-secondary rounded-lg shadow-lg p-6">
      <div className="flex items-center w-full gap-3 mb-4">
        {step.icon && <div className="text-2xl">{step.icon}</div>}
        <h3 className="text-xl w-full font-bold text-center">{step.title}</h3>
      </div>

      <div className="mb-6 text-center">{step.content}</div>

      {arrow}

      <div className="flex flex-col gap-2 justify-between items-center">
        <div className="text-sm">
          <span>
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-light-hover dark:bg-dark-hover text-black dark:text-dark-textPrimary rounded hover:bg-light-active dark:hover:bg-dark-active transition-all"
            >
              Previous
            </button>
          )}

          <button
            onClick={nextStep}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
          >
            {currentStep === totalSteps - 1 ? "Finish" : "Next"}
          </button>

          {step.showSkip && (
            <button
              onClick={skipTour}
              className="px-4 py-2 text-black dark:text-dark-textSecondary hover:bg-light-hover dark:hover:bg-dark-hover rounded transition-all"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomCard;
