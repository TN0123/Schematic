import { Goal, GoalDuration } from "./GoalsPanel";
import { Loader2 } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
  handleGoalClick: (goalId: string) => void;
  removing: boolean;
}

const durationColors: Record<
  GoalDuration,
  { border: string; bg: string; text: string }
> = {
  DAILY: {
    border: "border-green-500",
    bg: "bg-green-100",
    text: "text-green-600",
  },
  WEEKLY: {
    border: "border-blue-500",
    bg: "bg-blue-100",
    text: "text-blue-600",
  },
  MONTHLY: {
    border: "border-yellow-500",
    bg: "bg-yellow-100",
    text: "text-yellow-600",
  },
  YEARLY: {
    border: "border-purple-500",
    bg: "bg-purple-100",
    text: "text-purple-600",
  },
};

export default function GoalCard({
  goal,
  handleGoalClick,
  removing,
}: GoalCardProps) {
  return (
    <div
      className={`flex w-full rounded-md border-l-4 items-center justify-between transition-all duration-500 shadow-sm hover:shadow-md hover:-translate-y-1 
    ${durationColors[goal.type].border} ${durationColors[goal.type].bg} 
    ${removing ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
    >
      <div className="flex w-full px-4 py-2 text-center justify-center items-center">
        <span
          className={`absolute left-2 ${
            durationColors[goal.type].text
          } text-xs font-semibold`}
        >
          {goal.type.charAt(0).toUpperCase()}
        </span>
        <button
          onClick={() => handleGoalClick(goal.id)}
          className="font-semibold text-sm flex w-full h-full items-center justify-center"
          disabled={removing}
        >
          {goal.title}
          {removing ? (
            <Loader2 className="animate-spin text-gray-600 w-4 h-4" />
          ) : (
            <></>
          )}
        </button>
      </div>
    </div>
  );
}
