import { Goal, GoalDuration } from "./GoalsPanel";
import { Loader2 } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
  handleGoalClick: (goalId: string) => void;
  removing: boolean;
}

const durationColors: Record<GoalDuration, string> = {
  DAILY: "bg-green-100 border-green-500",
  WEEKLY: "bg-blue-100 border-blue-500",
  MONTHLY: "bg-yellow-100 border-yellow-500",
  YEARLY: "bg-indigo-100 border-indigo-500",
};

export default function GoalCard({
  goal,
  handleGoalClick,
  removing,
}: GoalCardProps) {
  return (
    <div
      className={`flex w-full border-l-4 rounded-md items-center justify-between transition-all duration-500 shadow-sm hover:shadow-md hover:-translate-y-1 ${
        durationColors[goal.type]
      } ${
        removing ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
    >
      <div className="flex flex-col w-full px-4 py-2 text-center justify-center">
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
