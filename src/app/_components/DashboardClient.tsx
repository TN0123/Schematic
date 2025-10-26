"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WriteSection from "./WriteSection";
import ScheduleSection from "./ScheduleSection";
import BulletinSection from "./BulletinSection";
import DashboardChat from "./DashboardChat";
import DateTimeDisplay from "./DateTimeDisplay";

interface DashboardClientProps {
  userId: string | undefined;
  recentDocuments: Array<{ id: string; title: string }>;
  bulletinNotes: Array<{ id: string; title: string; type: string }>;
  goals: Array<{ id: string; title: string; type: string; createdAt: Date }>;
  totalGoalsCount: number;
}

const MemoizedWriteSection = memo(WriteSection);
const MemoizedScheduleSection = memo(ScheduleSection);
const MemoizedBulletinSection = memo(BulletinSection);
const MemoizedDateTimeDisplay = memo(DateTimeDisplay);

function DashboardClient({
  userId,
  recentDocuments,
  bulletinNotes,
  goals,
  totalGoalsCount,
}: DashboardClientProps) {
  const [isChatActive, setIsChatActive] = useState(false);

  return (
    <main className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Centered Date/Time Display */}
        <AnimatePresence>
          {!isChatActive && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-16 flex justify-center"
            >
              <MemoizedDateTimeDisplay />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Chat Assistant */}
        {userId && (
          <DashboardChat userId={userId} onChatActiveChange={setIsChatActive} />
        )}

        {/* Three Equal Height Columns */}
        <AnimatePresence>
          {!isChatActive && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-96"
            >
              {/* Notebook Column */}
              <div className="flex flex-col h-auto md:h-full">
                <MemoizedWriteSection recentDocuments={recentDocuments} />
              </div>

              {/* Bulletin Column */}
              <div className="flex flex-col h-auto md:h-full">
                <MemoizedBulletinSection bulletinNotes={bulletinNotes} />
              </div>

              {/* Schedule Column */}
              <div className="flex flex-col h-auto md:h-full">
                <MemoizedScheduleSection
                  userId={userId || ""}
                  initialGoals={goals}
                  initialTotalGoalsCount={totalGoalsCount}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default memo(DashboardClient);
