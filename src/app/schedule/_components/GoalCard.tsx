import { Check, X } from "lucide-react";
import { Goal, GoalDuration } from "./GoalsPanel";

interface GoalCardProps {
  goal: Goal;
}

const durationColors: Record<GoalDuration, string> = {
  DAILY: "bg-red-100 border-red-500",
  WEEKLY: "bg-blue-100 border-blue-500",
  MONTHLY: "bg-green-100 border-green-500",
  YEARLY: "bg-yellow-100 border-yellow-500",
};

export default function GoalCard({ goal }: GoalCardProps) {
  return (
    <div
      className={`flex w-full border-l-4 rounded-md items-center justify-between transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1 ${
        durationColors[goal.duration]
      }`}
    >
      <div className="flex flex-col w-full px-4 py-2 text-center justify-center">
        <span className="font-semibold text-sm">{goal.title}</span>
      </div>
    </div>
  );
}
