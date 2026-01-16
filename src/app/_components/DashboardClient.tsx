"use client";

import { memo } from "react";
import DashboardChat from "./DashboardChat";
import DateTimeDisplay from "./DateTimeDisplay";

interface DashboardClientProps {
  userId: string | undefined;
  recentDocuments: Array<{ id: string; title: string }>;
  bulletinNotes: Array<{ id: string; title: string; type: string }>;
  goals: Array<{ id: string; title: string; type: string; createdAt: Date }>;
  totalGoalsCount: number;
}

const MemoizedDateTimeDisplay = memo(DateTimeDisplay);

function DashboardClient({ userId }: DashboardClientProps) {
  return (
    <main className="min-h-screen w-full px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background">
      <div className="max-w-4xl mx-auto min-h-screen flex flex-col">
        {/* Date/Time section with fixed height to prevent layout shift */}
        <div
          className="pt-10 sm:pt-12 lg:pt-16 flex justify-center"
          style={{
            // Reserve consistent space for the date/time display
            minHeight: "calc(120px + 2.5rem)",
          }}
        >
          <MemoizedDateTimeDisplay userId={userId} />
        </div>

        {/* Chat section - fills remaining space with smooth transitions */}
        <div className="flex-1 flex items-start justify-center mt-36">
          {userId && <DashboardChat userId={userId} />}
        </div>
      </div>
    </main>
  );
}

export default memo(DashboardClient);
