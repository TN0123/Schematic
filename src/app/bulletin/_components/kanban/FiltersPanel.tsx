import { Search } from "lucide-react";
import { KanbanState, Priority } from "./types";
import { PRIORITY_OPTIONS, DUE_DATE_OPTIONS } from "./constants";

interface FiltersPanelProps {
  filters: KanbanState["filters"];
  onUpdateFilters: (updates: Partial<KanbanState["filters"]>) => void;
  availableAssignees: string[];
}

export function FiltersPanel({
  filters,
  onUpdateFilters,
  availableAssignees,
}: FiltersPanelProps) {
  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 mb-4 border dark:border-dark-divider">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => onUpdateFilters({ search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
            />
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) =>
              onUpdateFilters({ priority: e.target.value as Priority | "all" })
            }
            className="w-full px-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Assignee
          </label>
          <select
            value={filters.assignee}
            onChange={(e) => onUpdateFilters({ assignee: e.target.value })}
            className="w-full px-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
          >
            <option value="all">All Assignees</option>
            {availableAssignees.map((assignee) => (
              <option key={assignee} value={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date Filter */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-dark-textPrimary">
            Due Date
          </label>
          <select
            value={filters.dueDate}
            onChange={(e) =>
              onUpdateFilters({
                dueDate: e.target.value as "all" | "overdue" | "today" | "week",
              })
            }
            className="w-full px-3 py-2 border dark:border-dark-divider rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-dark-background dark:text-dark-textPrimary"
          >
            {DUE_DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
