import { BarChart3 } from "lucide-react";
import { ProjectStats } from "./types";

interface StatsPanelProps {
  stats: ProjectStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg border dark:border-dark-divider mb-4 p-3">
      <div className="flex flex-wrap gap-4 text-sm justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Total:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {stats.totalTasks}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Completed:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {stats.completedTasks}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Overdue:</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {stats.overdueTasks}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">
            High Priority:
          </span>
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            {stats.highPriorityTasks}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Progress:</span>
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {stats.completionRate.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
