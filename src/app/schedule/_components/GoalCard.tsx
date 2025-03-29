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
      className={`flex w-full border-l-4 rounded-md items-center justify-between p-3 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1 ${
        durationColors[goal.duration]
      }`}
    >
      {/* Delete Button */}
      <button className="flex justify-center items-center rounded-full hover:bg-red-300 p-2 transition cursor-pointer">
        <X className="text-red-600" />
      </button>

      {/* Goal Info */}
      <div className="flex flex-col px-4 text-center justify-center">
        <span className="font-bold text-md">{goal.title}</span>
        <span className="text-sm text-gray-500">
          {GoalDuration[goal.duration] ?? "Unknown"}
        </span>
      </div>

      {/* Complete Button */}
      <button className="flex justify-center items-center rounded-full hover:bg-green-300 p-2 transition cursor-pointer">
        <Check className="text-green-600" />
      </button>
    </div>
  );
}
