import prisma from "@/lib/prisma";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";
import { aggregateAllTodos, formatTodosForPrompt } from "@/lib/todo-aggregation";
import {
  formatExtendedMemoryForPrompt,
  getExtendedMemoryContext,
} from "@/lib/memory";
import type { ScheduleContext } from "@/scripts/ai/chat/types";

type LoadScheduleContextParams = {
  instructions: string;
  userId?: string;
  timezone?: string;
  goalsView?: "list" | "text" | "todo";
};

function buildGoalsContextFromList(goals: Array<{ title: string; type: string }>) {
  return `User's Goals:\n${goals
    .map((goal) => `- ${goal.title} (${goal.type} goal)`)
    .join("\n")}`;
}

export async function loadScheduleContext({
  instructions,
  userId,
  timezone,
  goalsView,
}: LoadScheduleContextParams): Promise<ScheduleContext> {
  const now = new Date();
  const userTimezone = timezone || "UTC";
  const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
  const yesterdayInUserTz = new Date(userNow);
  yesterdayInUserTz.setDate(yesterdayInUserTz.getDate() - 1);
  const tomorrowInUserTz = new Date(userNow);
  tomorrowInUserTz.setDate(tomorrowInUserTz.getDate() + 1);

  let memoryContext = "";
  let goalsContext = "";
  let events: Array<{ title: string; start: Date; end: Date }> = [];
  let assistantName = "AI Life Assistant";

  if (!userId || !timezone) {
    return {
      now,
      userTimezone,
      userNow,
      yesterdayInUserTz,
      tomorrowInUserTz,
      memoryContext,
      goalsContext,
      events,
      assistantName,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { goalText: true, assistantName: true },
    });

    if (user?.assistantName) {
      assistantName = user.assistantName;
    }

    const memory = await getExtendedMemoryContext(userId, userTimezone, instructions);
    memoryContext = formatExtendedMemoryForPrompt(memory);

    if (goalsView === "text" && user?.goalText) {
      goalsContext = `User's Goals (Free-form Text):\n${user.goalText}`;
    } else if (goalsView === "todo") {
      const allTodos = await aggregateAllTodos(userId, 50);
      goalsContext = formatTodosForPrompt(allTodos);
    } else {
      const goals = await prisma.goal.findMany({
        where: { userId },
        select: { title: true, type: true },
      });
      goalsContext = buildGoalsContextFromList(goals);
    }

    const todayBounds = getUtcDayBoundsForTimezone(now, timezone);
    events = await prisma.event.findMany({
      where: {
        userId,
        start: {
          gte: now,
        },
        end: {
          lte: todayBounds.endUtc,
        },
      },
      select: { title: true, start: true, end: true },
    });
  } catch (error) {
    console.error("Could not find user to get schedule context", error);
  }

  return {
    now,
    userTimezone,
    userNow,
    yesterdayInUserTz,
    tomorrowInUserTz,
    memoryContext,
    goalsContext,
    events,
    assistantName,
  };
}
