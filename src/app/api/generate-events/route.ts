import { NextResponse } from "next/server";
import { generate_events } from "@/scripts/ai/generate-events";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, timezone, userId, goalsView } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Ensure the user is only generating events for themselves
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await generate_events(text, timezone, userId, goalsView);

    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedResult);

    // Handle the response format - it could be an array (old format) or object (new format)
    let events = [];
    let reminders = [];

    if (Array.isArray(parsed)) {
      // Old format - just events
      events = parsed;
    } else {
      // New format - object with events and reminders
      events = parsed.events || [];
      reminders = parsed.reminders || [];
    }

    // Create reminders in the database if any were generated
    const createdReminders = [];
    if (reminders.length > 0) {
      for (const reminder of reminders) {
        try {
          const createdReminder = await prisma.reminder.create({
            data: {
              text: reminder.text,
              time: new Date(reminder.time),
              isAISuggested: false,
              userId: session.user.id,
            },
          });
          createdReminders.push(createdReminder);
        } catch (error) {
          console.error("Error creating reminder:", error);
          // Continue with other reminders even if one fails
        }
      }
    }

    return NextResponse.json(
      {
        events,
        reminders: createdReminders.map((r) => ({
          ...r,
          time: r.time.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating events:", error);
    return NextResponse.json(
      { error: "Failed to generate events" },
      { status: 500 }
    );
  }
}
