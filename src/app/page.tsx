import {
  Calendar,
  ClipboardList,
  PenLine,
  PlusCircle,
  FileText,
  Clock,
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

  if (userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    [recentDocuments, upcomingEvents, bulletinNotes] = await Promise.all([
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary">
                  <ClipboardList className="h-6 w-6 mr-3 text-green-500 dark:text-green-400" />
                  Bulletin
                </h2>
                <TransitionLink
                  href="/bulletin"
                  className="text-sm font-medium text-green-500 dark:text-green-400 rounded-lg px-3 py-1 transition-all duration-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                >
                  View all
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold flex items-center text-gray-900 dark:text-dark-textPrimary">
                  <Calendar className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
                  Today's Schedule
                </h2>
                <TransitionLink
                  href="/schedule"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 rounded-lg px-3 py-1 transition-all duration-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                >
                  View all
                </TransitionLink>
              </div>
              <div className="bg-white dark:bg-dark-secondary rounded-lg shadow p-4 space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.title} className="flex items-start">
                    <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-1 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-dark-textPrimary">
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-dark-textSecondary">
                        <EventTime startTime={event.start} />
                      </p>
                    </div>
                  </div>
                ))}
                <TransitionLink
                  href="/schedule"
                  className="flex items-center text-blue-600 dark:text-blue-400 rounded-lg p-2 transition-all duration-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 -m-2"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Add event
                </TransitionLink>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
