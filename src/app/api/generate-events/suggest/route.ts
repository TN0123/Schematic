import { NextResponse } from "next/server";
import { suggest_events } from "@/scripts/schedule/suggest-events";

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

    // Format reminders for local state (don't save to database)
    const formattedReminders = reminders.map((reminder: any) => ({
      id: `ai-suggestion-${Date.now()}-${Math.random()}`, // Generate temporary ID
      text: reminder.text,
      time: new Date(reminder.time),
      isAISuggested: true,
      isRead: false,
    }));

    return NextResponse.json(
      {
        events,
        reminders: formattedReminders,
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
