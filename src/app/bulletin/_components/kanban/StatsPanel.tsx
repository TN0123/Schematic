import { BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { ProjectStats } from "./types";

interface StatsPanelProps {
  stats: ProjectStats;
  isExpanded: boolean;
  onToggle: () => void;
}

export function StatsPanel({ stats, isExpanded, onToggle }: StatsPanelProps) {
  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 mb-6 border dark:border-dark-divider">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold dark:text-dark-textPrimary flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Overview
        </h3>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded transition-colors"
          aria-label={isExpanded ? "Collapse overview" : "Expand overview"}
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Tasks
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completedTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.overdueTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Overdue
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.highPriorityTasks}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              High Priority
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.completionRate.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completion
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
