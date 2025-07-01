import { Calendar, ClipboardList, PlusCircle, TrendingUp } from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WriteSection from "./_components/WriteSection";
import EventTime from "./_components/EventTime";
import DateTimeDisplay from "./_components/DateTimeDisplay";
import DashboardEvents from "./_components/DashboardEvents";

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
          take: 3,
          select: { title: true, id: true },
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
    <main className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-dark-background">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-dark-textPrimary">
              Dashboard
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-dark-textSecondary mt-1">
              Welcome back!
            </p>
          </div>
          <DateTimeDisplay />
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
                    className="block p-3 rounded-md bg-gray-50 dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-neutral-800"
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
                <DashboardEvents userId={userId || ""} />

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-dark-divider" />

                {/* Goals Subsection */}
                <div>
                  <div className="flex items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-dark-textPrimary">
                      Goals
                    </h3>
                  </div>
                  <div className="space-y-1">
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
                              className="flex items-center py-1"
                            >
                              <div className="mr-3 flex-shrink-0">
                                <span
                                  className={`text-sm font-bold ${getGoalTypeColor(
                                    goal.type
                                  )}`}
                                >
                                  {getGoalTypeLetter(goal.type)}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-dark-textPrimary text-sm">
                                  {goal.title}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {totalGoalsCount > 3 && (
                          <TransitionLink
                            href="/schedule"
                            className="flex items-center text-blue-600 dark:text-blue-400 text-sm pt-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {totalGoalsCount - 3} more
                          </TransitionLink>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-dark-textSecondary text-sm py-1">
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
