import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ical from "node-ical";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    // Restrict to .ics content and limit size to 1MB
    const allowedMimeTypes = new Set([
      "text/calendar",
      "application/octet-stream", // some browsers may send this for .ics
    ]);
    const maxBytes = 1 * 1024 * 1024;

    if (typeof file.size === "number" && file.size > maxBytes) {
      return NextResponse.json(
        { message: "File too large. Max 1MB" },
        { status: 413 }
      );
    }

    if (file.type && !allowedMimeTypes.has(file.type)) {
      return NextResponse.json(
        { message: "Unsupported file type" },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const icsString = buffer.toString("utf-8");
    const data = ical.parseICS(icsString);

    const events: Array<{ id: string; title: string; start: Date; end: Date }> = [];
    const seenEventKeys = new Set<string>();

    for (const k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        const event: any = (data as any)[k];
        
        if (event && event.type === "VEVENT") {
          // Skip events without valid start/end dates
          if (!event.start || !event.end) {
            continue;
          }

          // Skip recurring event definitions (those with RRULE but no specific instance)
          // We only want actual event instances
          if (event.rrule && !event.recurrenceid) {
            continue;
          }

          const uid = String(event.uid ?? k);
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);

          // Skip invalid dates
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            continue;
          }

          // Create a unique key based on title, start, and end to catch all duplicates
          // This handles cases where the same event appears with different UIDs
          const normalizedTitle = String(event.summary ?? "Untitled Event")
            .toLowerCase()
            .trim();
          const eventKey = `${normalizedTitle}|${startDate.toISOString()}|${endDate.toISOString()}`;

          // Skip if we've already seen this exact event instance
          if (seenEventKeys.has(eventKey)) {
            continue;
          }

          seenEventKeys.add(eventKey);

          // Generate a unique ID for this specific event instance
          const uniqueId = `${uid}_${startDate.getTime()}`;

          events.push({
            id: uniqueId,
            title: String(event.summary ?? "Untitled Event"),
            start: startDate,
            end: endDate,
          });
        }
      }
    }

    // Sort events by start time for better UX
    events.sort((a, b) => a.start.getTime() - b.start.getTime());

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error parsing ICS file:", error);
    return NextResponse.json(
      { message: "Error parsing ICS file." },
      { status: 500 }
    );
  }
}
