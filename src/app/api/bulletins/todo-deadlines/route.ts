import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch todo bulletins
    const todoBulletins = await prisma.bulletin.findMany({
      where: {
        userId,
        type: "todo",
      },
      select: {
        id: true,
        title: true,
        data: true,
      },
    });

    // Extract todo items with due dates, grouped by date
    const todosByDate: Record<
      string,
      Array<{ text: string; bulletinTitle: string; checked: boolean }>
    > = {};

    for (const bulletin of todoBulletins) {
      const data = bulletin.data as any;
      if (data?.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          // Only include items that have a due date and are not checked
          if (item.dueDate && item.text && !item.checked) {
            const dueDate = item.dueDate;
            if (!todosByDate[dueDate]) {
              todosByDate[dueDate] = [];
            }
            todosByDate[dueDate].push({
              text: item.text,
              bulletinTitle: bulletin.title || "Untitled",
              checked: item.checked || false,
            });
          }
        }
      }
    }

    return NextResponse.json({ todosByDate });
  } catch (error) {
    console.error("Error fetching todo deadlines:", error);
    return NextResponse.json(
      { error: "Failed to fetch todo deadlines" },
      { status: 500 }
    );
  }
}

