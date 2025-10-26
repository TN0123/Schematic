import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";
import { aggregateAllTodos } from "@/lib/todo-aggregation";

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

    // Fetch and aggregate all todos from all todo bulletins
    const aggregatedTodos = await aggregateAllTodos(userId, 50);

    // Convert to the expected format for this API
    const todoItems = aggregatedTodos.map(todo => ({
      bulletinTitle: todo.noteTitle,
      text: todo.text,
      dueDate: todo.dueDate,
      checked: todo.checked,
    }));

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
