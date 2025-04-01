import { useState } from "react";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import GoalCard from "./GoalCard";

export enum GoalDuration {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export interface Goal {
  id: string;
  title: string;
  duration: GoalDuration;
}

export default function GoalsPanel() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filters, setFilters] = useState<GoalDuration[]>([GoalDuration.DAILY]);

  const handleAddGoal = (newGoal: Goal) => {
    setGoals((prevGoals) => [...prevGoals, newGoal]);
  };

  const handleGoalClick = (goalId: string) => {
    setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== goalId));
  };

  const handleFilterChange = (duration: GoalDuration) => {
    setFilters((prevFilters) =>
      prevFilters.includes(duration)
        ? prevFilters.filter((filter) => filter !== duration)
        : [...prevFilters, duration]
    );
  };

  return (
    <aside
      className={`relative ${isCollapsed ? "w-14" : "w-80"} bg-white border-r ${
        isCollapsed ? "px-2 py-6" : "px-4 py-6"
      } flex flex-col transition-all duration-300 items-center`}
    >
      <div className="w-full flex flex-col items-center justify-between">
        <div className="flex w-full justify-between">
          {!isCollapsed && (
            <h1 className="font-bold text-2xl w-full text-gray-900 tracking-wide transition-opacity duration-300">
              Goals
            </h1>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-full hover:bg-gray-200 transition-all duration-200"
          >
            {isCollapsed ? (
              <PanelLeftOpen size={24} className="text-gray-700" />
            ) : (
              <PanelLeftClose size={24} className="text-gray-700" />
            )}
          </button>
        </div>
        {!isCollapsed && (
          <div className="flex gap-3 my-4 justify-center">
            {Object.values(GoalDuration).map((duration) => (
              <button
                key={duration}
                className={`text-gray-900 text-xs font-medium px-2 py-2 shadow-sm rounded-md border border-gray-300 hover:bg-gray-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200 ${
                  filters.includes(duration) ? "bg-gray-900 text-white" : ""
                }`}
                onClick={() => handleFilterChange(duration)}
              >
                {duration.charAt(0).toUpperCase() +
                  duration.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div className="flex flex-col gap-4 py-4 overflow-y-auto h-3/4 w-full">
            {goals.map(
              (goal) =>
                (filters.length === 0 || filters.includes(goal.duration)) && (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    handleGoalClick={handleGoalClick}
                  />
                )
            )}
          </div>

          <div className="flex gap-2 mt-2 text-sm justify-center items-center">
            <select
              id="goalType"
              className="border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
              value={currentDuration}
              onChange={(e) => {
                setCurrentDuration(
                  e.target.value.toUpperCase() as GoalDuration
                );
              }}
            >
              {Object.values(GoalDuration).map((duration) => (
                <option key={duration} value={duration}>
                  {duration.charAt(0).toUpperCase() +
                    duration.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="border border-gray-300 px-2 py-2 rounded-md text-center text-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
              onChange={(e) => setGoalToAdd(e.target.value)}
              value={goalToAdd}
              placeholder="Add a new goal..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && goalToAdd.trim() !== "") {
                  handleAddGoal({
                    id: Date.now().toString(),
                    title: goalToAdd,
                    duration: currentDuration,
                  });
                  setGoalToAdd("");
                }
              }}
            />
          </div>
        </>
      )}
    </aside>
  );
}
