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
  createdAt: string;
}

export default function GoalsPanel() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const dummyGoals = [
    {
      id: "1",
      title: "Morning Workout",
      duration: GoalDuration.DAILY,
      createdAt: "2024-03-28T08:00:00Z",
    },
    {
      id: "2",
      title: "Read a Book",
      duration: GoalDuration.WEEKLY,
      createdAt: "2024-03-21T10:30:00Z",
    },
    {
      id: "3",
      title: "Save $500",
      duration: GoalDuration.MONTHLY,
      createdAt: "2024-03-01T12:00:00Z",
    },
    {
      id: "4",
      title: "Learn a New Skill",
      duration: GoalDuration.YEARLY,
      createdAt: "2024-01-01T14:15:00Z",
    },
    {
      id: "5",
      title: "Morning Workout",
      duration: GoalDuration.DAILY,
      createdAt: "2024-03-28T08:00:00Z",
    },
    {
      id: "6",
      title: "Read a Book",
      duration: GoalDuration.WEEKLY,
      createdAt: "2024-03-21T10:30:00Z",
    },
    {
      id: "7",
      title: "Save $500",
      duration: GoalDuration.MONTHLY,
      createdAt: "2024-03-01T12:00:00Z",
    },
    {
      id: "8",
      title: "Learn a New Skill",
      duration: GoalDuration.YEARLY,
      createdAt: "2024-01-01T14:15:00Z",
    },
    {
      id: "9",
      title: "Save $500",
      duration: GoalDuration.MONTHLY,
      createdAt: "2024-03-01T12:00:00Z",
    },
    {
      id: "10",
      title: "Learn a New Skill",
      duration: GoalDuration.YEARLY,
      createdAt: "2024-01-01T14:15:00Z",
    },
  ];

  return (
    <aside
      className={`relative ${
        isCollapsed ? "w-14" : "w-80"
      } bg-white border-r px-6 py-6 flex flex-col transition-all duration-300 items-center`}
    >
      <div className="flex flex-col items-center justify-between">
        {!isCollapsed && (
          <>
            <h1 className="font-bold text-2xl w-full text-gray-900 tracking-wide transition-opacity duration-300">
              Goals
            </h1>

            <div className="flex gap-3 my-4 justify-center">
              {Object.values(GoalDuration).map((duration) => (
                <button
                  key={duration}
                  className="text-gray-900 text-xs font-medium px-2 py-2 shadow-sm rounded-md border border-gray-300 hover:bg-gray-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 transition-all duration-200"
                >
                  {duration.charAt(0).toUpperCase() +
                    duration.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-2 top-7 rounded-full hover:bg-gray-200 transition-colors duration-200"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={24} className="text-gray-700" />
          ) : (
            <PanelLeftClose size={24} className="text-gray-700" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex flex-col gap-4 py-4 overflow-y-auto h-3/4 w-full">
            {dummyGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>

          <div className="flex gap-2 mt-2 text-sm justify-center items-center">
            <select
              id="goalType"
              className="border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
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
              className="border border-gray-300 px-2 py-2 rounded-md text-center text-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition duration-200"
              placeholder="Add a goal"
            />
          </div>
        </>
      )}
    </aside>
  );
}
