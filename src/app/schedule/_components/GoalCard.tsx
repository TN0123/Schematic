import { Goal, GoalDuration } from "./GoalsPanel";
import { Loader2 } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
  handleGoalClick: (goalId: string) => void;
  removing: boolean;
}

const durationColors: Record<GoalDuration, string> = {
  DAILY: "green",
  WEEKLY: "blue",
  MONTHLY: "yellow",
  YEARLY: "purple",
};

export default function GoalCard({
  goal,
  handleGoalClick,
  removing,
}: GoalCardProps) {
  return (
    <div
      className={`flex w-full border-l-4 rounded-md items-center justify-between transition-all duration-500 shadow-sm hover:shadow-md hover:-translate-y-1 border-${
        durationColors[goal.type]
      }-500 bg-${durationColors[goal.type]}-100 ${
        removing ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex w-full px-4 py-2 text-center justify-center items-center">
        <span
          className={`absolute left-2 text-${
            durationColors[goal.type]
          }-600 text-xs font-semibold`}
        >
          {goal.type.charAt(0).toUpperCase()}
        </span>
        <button
          onClick={() => handleGoalClick(goal.id)}
          className="font-semibold text-sm flex items-center justify-center"
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
