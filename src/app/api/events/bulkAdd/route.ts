import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { normalizeUrls } from "@/lib/url";
import { recordEventActionsBatch } from "@/lib/habit-ingestion";
import { invalidateAllUserCaches } from "@/lib/cache-utils";
import { pushEventToGoogle } from "@/lib/google-calendar-sync";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { events } = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "No events provided" },
        { status: 400 }
      );
    }

    const createdEvents = await prisma.$transaction(
      events.map((event) =>
        // Normalize each event's links
        {
          const normalizedLinks = normalizeUrls(event.links);
          return prisma.event.create({
            data: {
              title: event.title,
              start: new Date(event.start),
              end: new Date(event.end),
              links: Array.isArray(normalizedLinks) ? normalizedLinks : undefined,
              userId: session.user.id!,
            },
          });
        }
      )
    );

    // Record habit actions for all created events
    recordEventActionsBatch(
      session.user.id,
      createdEvents.map(event => ({
        actionType: 'created' as const,
        eventData: {
          title: event.title,
          start: event.start,
          end: event.end,
        },
        eventId: event.id,
      }))
    ).catch(err => console.error('Failed to record habit actions:', err));

    // Invalidate cache asynchronously (don't await to avoid blocking)
    invalidateAllUserCaches(session.user.id).catch(err => 
      console.error('Failed to invalidate cache:', err)
    );

    // Sync to Google Calendar if enabled (don't await to avoid blocking)
    createdEvents.forEach(event => {
      pushEventToGoogle(event.id, session.user.id).catch(err => 
        console.error('Failed to sync event to Google Calendar:', err)
      );
    });

    return NextResponse.json(createdEvents, { status: 201 });
  } catch (error) {
    console.error("Error creating multiple events:", error);
    return NextResponse.json(
      { error: "Error creating events" },
      { status: 500 }
    );
  }
}
