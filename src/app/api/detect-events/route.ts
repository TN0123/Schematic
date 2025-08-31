import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { generate_events } from "@/scripts/schedule/generate-events";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ events: [] });
    }

    console.log("Detecting events for text:", text);

    // Use the existing generate_events function
    const result = await generate_events(text, timezone, session.user.id);
    console.log("AI result:", result);

    // Parse the JSON response
    const cleanedResult = result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanedResult);

    // Handle the response format - it could be an array (old format) or object (new format)
    let events = [];
    if (Array.isArray(parsed)) {
      events = parsed;
    } else {
      events = parsed.events || [];
    }

    console.log("Extracted events:", events);

    // Convert to consistent format
    const detectedEvents = events.map((event: any, index: number) => ({
      id: event.id || `detected-${index}`,
      title: event.title,
      start: event.start,
      end: event.end,
      originalText: text,
      confidence: 0.8
    }));

    return NextResponse.json({ events: detectedEvents });
  } catch (error) {
    console.error("Error in detect-events API:", error);
    return NextResponse.json(
      { error: "Failed to detect events", events: [] },
      { status: 500 }
    );
  }
}
