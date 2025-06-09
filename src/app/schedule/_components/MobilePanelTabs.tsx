import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Target, Plus, FileUp } from "lucide-react";
import { Goal, GoalDuration } from "./GoalsPanel";
import GoalCard from "./GoalCard";

interface MobilePanelTabsProps {
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  handleSubmit: () => void;
  setShowModal: (show: boolean) => void;
  setIsFileUploaderModalOpen: (open: boolean) => void;
  setIsIcsUploaderModalOpen: (open: boolean) => void;
}

export default function MobilePanelTabs({
  inputText,
  setInputText,
  loading,
  handleSubmit,
  setShowModal,
  setIsFileUploaderModalOpen,
  setIsIcsUploaderModalOpen,
}: MobilePanelTabsProps) {
  const [activeTab, setActiveTab] = useState<"events" | "goals">("events");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalToAdd, setGoalToAdd] = useState<string>("");
  const [currentDuration, setCurrentDuration] = useState<GoalDuration>(
    GoalDuration.DAILY
  );
  const [filters, setFilters] = useState<GoalDuration[]>([]);
  const [removingGoals, setRemovingGoals] = useState<string[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    if (activeTab === "goals") {
      fetchGoals();
    }
  }, [activeTab]);

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) {
        throw new Error("Failed to fetch goals");
      }
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const addGoal = async () => {
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goalToAdd,
        type: currentDuration,
      }),
    });

    const newGoal = await response.json();
    setGoals([...goals, newGoal]);
    setGoalToAdd("");
  };

  const deleteGoal = async (id: string) => {
    setRemovingGoals((prev) => [...prev, id]);

    await fetch(`/api/goals/${id}`, {
      method: "DELETE",
    });

    setGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== id));
    setRemovingGoals((prev) => prev.filter((goalId) => goalId !== id));
  };

  const handleFilterChange = (duration: GoalDuration) => {
    setFilters((prevFilters) =>
      prevFilters.includes(duration)
        ? prevFilters.filter((filter) => filter !== duration)
        : [...prevFilters, duration]
    );
  };

  const filteredGoals =
    filters.length > 0
      ? goals.filter((goal) => filters.includes(goal.type))
      : goals;

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b dark:border-dark-divider">
        <button
          onClick={() => setActiveTab("events")}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors duration-200 ${
            activeTab === "events"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar size={16} />
            Events
          </div>
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors duration-200 ${
            activeTab === "goals"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-dark-textSecondary hover:bg-gray-100 dark:hover:bg-dark-actionHover"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Target size={16} />
            Goals
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "events" ? (
          <div className="p-4 flex flex-col gap-6">
            {/* Event Generation */}
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary">
                Generate with AI
              </h3>
              <textarea
                className="w-full p-3 bg-gray-50 dark:bg-dark-paper border dark:border-dark-divider rounded-lg resize-none text-black dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Describe your schedule to generate events..."
                rows={4}
              />
              <button
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? "Generating..." : "Generate Events"}
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary">
                Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-colors duration-200 border dark:border-dark-divider text-sm"
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={16} />
                  Add Event
                </button>
                <button
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-colors duration-200 border dark:border-dark-divider text-sm"
                  onClick={() => setIsFileUploaderModalOpen(true)}
                >
                  <FileUp size={16} />
                  Upload
                </button>
                <button
                  className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 dark:bg-dark-paper text-gray-700 dark:text-dark-textPrimary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-actionHover transition-colors duration-200 border dark:border-dark-divider text-sm"
                  onClick={() => setIsIcsUploaderModalOpen(true)}
                >
                  <Calendar size={16} />
                  Import from .ics
                </button>
              </div>
            </div>

            {/* Suggested Events */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Target
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />
                <h3 className="font-semibold text-blue-800 dark:text-blue-400">
                  AI Suggestions
                </h3>
              </div>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                Tap the refresh icon on the calendar to get smart suggestions
                for your day.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-6">
            {/* Add Goal */}
            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary">
                Add New Goal
              </h3>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={goalToAdd}
                    onChange={(e) => setGoalToAdd(e.target.value)}
                    placeholder="Enter goal title..."
                    className="flex-1 px-3 py-2 border dark:border-dark-divider rounded-lg bg-white dark:bg-dark-paper text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={currentDuration}
                    onChange={(e) =>
                      setCurrentDuration(e.target.value as GoalDuration)
                    }
                    className="px-3 py-2 border dark:border-dark-divider rounded-lg bg-white dark:bg-dark-paper text-gray-900 dark:text-dark-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.values(GoalDuration).map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addGoal}
                  disabled={!goalToAdd.trim()}
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Goal
                </button>
              </div>
            </div>

            {/* Goals List */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-gray-800 dark:text-dark-textPrimary">
                Your Goals
              </h3>
              {/* Goal Filters */}
              <div className="flex gap-2 flex-wrap">
                {Object.values(GoalDuration).map((duration) => (
                  <button
                    key={duration}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
                      filters.includes(duration)
                        ? "bg-gray-900 text-white border-gray-900 dark:bg-blue-500 dark:text-white dark:border-blue-500"
                        : "text-gray-700 border-gray-300 hover:bg-gray-100 dark:text-dark-textSecondary dark:border-dark-divider dark:hover:bg-dark-actionHover"
                    }`}
                    onClick={() => handleFilterChange(duration)}
                  >
                    {duration}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredGoals.length > 0 ? (
                  filteredGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      handleGoalClick={deleteGoal}
                      removing={removingGoals.includes(goal.id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-dark-textSecondary text-sm">
                      No goals yet. Add one above!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
