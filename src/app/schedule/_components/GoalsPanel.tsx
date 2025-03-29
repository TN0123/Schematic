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
  ];

  return (
    <aside
      className={`relative ${
        isCollapsed ? "w-16" : "w-80"
      } bg-white border-r px-4 py-4 flex flex-col gap-4 transition-all duration-300`}
    >
      <div className="flex items-center">
        {!isCollapsed && (
          <h1 className="font-semibold text-2xl transition-opacity duration-300">
            Goals
          </h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-2 top-4 p-2"
        >
          {isCollapsed ? <PanelLeftClose /> : <PanelLeftOpen />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-4">
          {dummyGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </aside>
  );
}
