import { ClipboardList, PlusCircle } from "lucide-react";
import { TransitionLink } from "@/components/utils/TransitionLink";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WriteSection from "./_components/WriteSection";
import DateTimeDisplay from "./_components/DateTimeDisplay";
import ScheduleSection from "./_components/ScheduleSection";

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
            <ScheduleSection
              userId={userId || ""}
              initialGoals={goals}
              initialTotalGoalsCount={totalGoalsCount}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
