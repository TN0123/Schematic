import {
  Calendar,
  ClipboardList,
  PenLine,
  PlusCircle,
  FileText,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WriteSection from "./_components/WriteSection";
import EventTime from "./_components/EventTime";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let recentDocuments: any[] = [];
  let upcomingEvents: any[] = [];
  let bulletinNotes: any[] = [];
  let goals: any[] = [];
  let totalGoalsCount = 0;

  if (userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    [recentDocuments, upcomingEvents, bulletinNotes, goals, totalGoalsCount] =
      await Promise.all([
        prisma.document.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: { title: true, id: true },
        }),
        prisma.event.findMany({
          where: {
            userId,
            start: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: { start: "asc" },
          take: 3,
          select: { title: true, start: true },
        }),
        prisma.bulletin.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: { title: true, id: true },
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
    <main className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background transition-all">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-dark-textPrimary">
            Dashboard
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-dark-textSecondary mt-1">
            Welcome back!
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <WriteSection recentDocuments={recentDocuments} />

            {/* Bulletin Section */}
            <section>
              <div className="mb-4">
                <TransitionLink
                  href="/bulletin"
                  className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary hover:text-green-600 dark:hover:text-green-400 transition-colors duration-300"
                >
                  <ClipboardList className="h-6 w-6 mr-3 text-green-500 dark:text-green-400" />
                  Bulletin
                </TransitionLink>
              </div>
              <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-4 space-y-3">
                {bulletinNotes.map((note) => (
                  <TransitionLink
                    key={note.id}
                    href={`/bulletin?noteId=${note.id}`}
                    className="block p-3 rounded-md bg-gray-50 dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-gray-800/60"
                  >
                    <p className="text-gray-800 dark:text-dark-textSecondary">
                      {note.title}
                    </p>
                  </TransitionLink>
                ))}
                <TransitionLink
                  href="/bulletin"
                  className="flex items-center p-3 rounded-md text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-300"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Add a note
                </TransitionLink>
              </div>
            </section>
          </div>

          {/* Schedule Section */}
          <div className="lg:col-span-1">
            <section>
              <div className="mb-4">
                <TransitionLink
                  href="/schedule"
                  className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                >
                  <Calendar className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
                  Schedule
                </TransitionLink>
              </div>

              <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-6 space-y-8">
                {/* Today's Schedule Subsection */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
                      Today's Events
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <div
                          key={event.title}
                          className="flex items-start py-2"
                        >
                          <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-dark-textPrimary">
                              {event.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-dark-textSecondary">
                              <EventTime startTime={event.start} />
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-2">
                        No events scheduled for today
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-dark-divider" />

                {/* Goals Subsection */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
                      Goals
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {goals.length > 0 ? (
                      <>
                        {goals.map((goal, index) => {
                          const getGoalTypeLetter = (type: string) => {
                            switch (type) {
                              case "DAILY":
                                return "D";
                              case "WEEKLY":
                                return "W";
                              case "MONTHLY":
                                return "M";
                              case "YEARLY":
                                return "Y";
                              default:
                                return "?";
                            }
                          };

                          const getGoalTypeColor = (type: string) => {
                            switch (type) {
                              case "DAILY":
                                return "text-green-600 dark:text-green-400";
                              case "WEEKLY":
                                return "text-blue-600 dark:text-blue-400";
                              case "MONTHLY":
                                return "text-yellow-600 dark:text-yellow-400";
                              case "YEARLY":
                                return "text-purple-600 dark:text-purple-400";
                              default:
                                return "text-gray-600 dark:text-dark-textSecondary";
                            }
                          };

                          return (
                            <div
                              key={`${goal.title}-${index}`}
                              className="flex items-center py-2"
                            >
                              <div className="mr-3 flex-shrink-0">
                                <span
                                  className={`text-base font-bold ${getGoalTypeColor(
                                    goal.type
                                  )}`}
                                >
                                  {getGoalTypeLetter(goal.type)}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-dark-textPrimary">
                                  {goal.title}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {totalGoalsCount > 3 && (
                          <TransitionLink
                            href="/schedule"
                            className="flex items-center text-blue-600 dark:text-blue-400 text-sm pt-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {totalGoalsCount - 3} more goals
                          </TransitionLink>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-2">
                        No goals set yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
