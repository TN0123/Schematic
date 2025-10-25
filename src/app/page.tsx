import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClient from "./_components/DashboardClient";

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
    <DashboardClient
      userId={userId}
      recentDocuments={recentDocuments}
      bulletinNotes={bulletinNotes}
      goals={goals}
      totalGoalsCount={totalGoalsCount}
    />
  );
}
