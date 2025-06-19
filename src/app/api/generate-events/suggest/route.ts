import { NextResponse } from "next/server";
import { suggest_events } from "@/scripts/schedule/suggest-events";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, timezone } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!timezone) {
      return NextResponse.json({ error: "Missing timezone" }, { status: 400 });
    }

    const result = await suggest_events(userId, timezone);
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const parsedResult = JSON.parse(cleanedResult);

    // Handle backward compatibility - if result is array, it's just events
    let events = [];
    let reminders = [];

    if (Array.isArray(parsedResult)) {
      // Old format - just events
      events = parsedResult;
    } else {
      // New format - object with events and reminders
      events = parsedResult.events || [];
      reminders = parsedResult.reminders || [];
    }

    // Save AI-suggested reminders to database
    const savedReminders = [];
    if (reminders.length > 0) {
      for (const reminder of reminders) {
        const savedReminder = await prisma.reminder.create({
          data: {
            text: reminder.text,
            time: new Date(reminder.time),
            isAISuggested: true,
            userId: userId,
          },
        });
        savedReminders.push(savedReminder);
      }
    }

    return NextResponse.json(
      {
        events,
        reminders: savedReminders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error suggesting events and reminders:", error);
    return NextResponse.json(
      { error: "Failed to suggest events and reminders" },
      { status: 500 }
    );
  }
}
