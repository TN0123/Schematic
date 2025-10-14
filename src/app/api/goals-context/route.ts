import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET - Fetch comprehensive Goals Panel context for AI reminder generation
 * This includes:
 * - Goal list (DAILY, WEEKLY, MONTHLY, YEARLY goals)
 * - Goal text (free-form text goals)
 * - Todo items with due dates from bulletins
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's goal text
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { goalText: true },
    });

    // Fetch user's goals list
    const goals = await prisma.goal.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch todo bulletins with items
    const todoBulletins = await prisma.bulletin.findMany({
      where: {
        userId,
        type: "todo",
      },
      select: {
        id: true,
        title: true,
        data: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Extract and organize todo items with due dates
    const todoItems: Array<{
      bulletinTitle: string;
      text: string;
      dueDate?: string;
      checked: boolean;
    }> = [];

    for (const bulletin of todoBulletins) {
      const data = bulletin.data as any;
      if (data?.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          if (item.text && !item.checked) {
            // Only include unchecked items
            todoItems.push({
              bulletinTitle: bulletin.title || "Untitled",
              text: item.text,
              dueDate: item.dueDate,
              checked: item.checked || false,
            });
          }
        }
      }
    }

    // Sort todo items by due date (items with dates first, then no-date items)
    todoItems.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return NextResponse.json({
      goalText: user?.goalText || "",
      goals: goals.map((g) => ({
        title: g.title,
        type: g.type,
      })),
      todoItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching goals context:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals context" },
      { status: 500 }
    );
  }
}
