import { ArrowRight } from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WriteSection from "./_components/WriteSection";
import DateTimeDisplay from "./_components/DateTimeDisplay";
import ScheduleSection from "./_components/ScheduleSection";
import DashboardChat from "./_components/DashboardChat";
import BulletinSection from "./_components/BulletinSection";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let recentDocuments: any[] = [];
  let bulletinNotes: any[] = [];
  let goals: any[] = [];
  let totalGoalsCount = 0;

  if (userId) {
    [recentDocuments, bulletinNotes, goals, totalGoalsCount] =
      await Promise.all([
        prisma.document.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { title: true, id: true },
        }),
        prisma.bulletin.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { title: true, id: true, type: true },
        }),
        prisma.goal.findMany({
          where: { userId },
          orderBy: [
            { type: "asc" }, // This will order by DAILY, WEEKLY, MONTHLY, YEARLY
            { createdAt: "desc" }, // Most recent within each type
          ],
          take: 3,
          select: { title: true, type: true, createdAt: true },
        }),
        prisma.goal.count({
          where: { userId },
        }),
      ]);
  }

  return (
    <main className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Centered Date/Time Display */}
        <div className="mb-16 flex justify-center">
          <DateTimeDisplay />
        </div>

        {/* Three Equal Height Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-96">
          {/* Notebook Column */}
          <div className="flex flex-col h-auto md:h-full">
            <WriteSection recentDocuments={recentDocuments} />
          </div>

          {/* Schedule Column */}
          <div className="flex flex-col h-auto md:h-full">
            <ScheduleSection
              userId={userId || ""}
              initialGoals={goals}
              initialTotalGoalsCount={totalGoalsCount}
            />
          </div>

          {/* Bulletin Column */}
          <div className="flex flex-col h-auto md:h-full">
            <BulletinSection bulletinNotes={bulletinNotes} />
          </div>
        </div>
      </div>

      {/* AI Chat Assistant */}
      {userId && <DashboardChat userId={userId} />}
    </main>
  );
}
