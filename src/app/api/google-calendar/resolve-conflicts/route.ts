import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getGoogleCalendarClient } from "@/lib/google-calendar-sync";
import { convertToGoogleDateTime, convertFromGoogleDateTime } from "@/lib/timezone";
import { generateSyncHash } from "@/lib/sync-conflict-resolver";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // No need to parse decisions since we always use local events

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: true,
      },
    });

    if (!user?.googleCalendarSyncEnabled || !user.googleCalendarId) {
      return NextResponse.json(
        { error: "Sync is not enabled" },
        { status: 400 }
      );
    }

    const client = await getGoogleCalendarClient(session.user.id);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let synced = 0;

    // Always use local events as source of truth
    // This means we push all local events to Google Calendar and ignore Google conflicts
    const localEvents = await prisma.event.findMany({
      where: { userId: session.user.id },
    });

    for (const localEvent of localEvents) {
      try {
        // Check if this event is already synced
        const existingSync = await prisma.syncedEvent.findUnique({
          where: { localEventId: localEvent.id },
        });

        if (existingSync) {
          // Update existing Google Calendar event
          const googleEvent = {
            summary: localEvent.title,
            start: convertToGoogleDateTime(localEvent.start, userTimezone),
            end: convertToGoogleDateTime(localEvent.end, userTimezone),
          };

          await client.updateEvent(user.googleCalendarId, existingSync.googleEventId, googleEvent);

          // Update sync hash
          const syncHash = generateSyncHash({
            id: localEvent.id,
            title: localEvent.title,
            start: localEvent.start,
            end: localEvent.end,
            links: localEvent.links || [],
          });

          await prisma.syncedEvent.update({
            where: { id: existingSync.id },
            data: { syncHash, lastSyncedAt: new Date() },
          });
        } else {
          // Create new Google Calendar event
          const googleEvent = {
            summary: localEvent.title,
            start: convertToGoogleDateTime(localEvent.start, userTimezone),
            end: convertToGoogleDateTime(localEvent.end, userTimezone),
          };

          const createdEvent = await client.createEvent(user.googleCalendarId, googleEvent);

          // Create sync mapping
          const syncHash = generateSyncHash({
            id: localEvent.id,
            title: localEvent.title,
            start: localEvent.start,
            end: localEvent.end,
            links: localEvent.links || [],
          });

          await prisma.syncedEvent.create({
            data: {
              userId: session.user.id,
              localEventId: localEvent.id,
              googleEventId: createdEvent.id,
              googleCalendarId: user.googleCalendarId,
              syncHash,
            },
          });
        }

        synced++;
      } catch (error) {
        console.error(`Error syncing event ${localEvent.id}:`, error);
      }
    }

    // Update sync token to mark initial sync as complete
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        googleCalendarSyncToken: 'initial-sync-complete',
        googleCalendarLastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error("Error resolving conflicts:", error);
    return NextResponse.json(
      { error: "Failed to resolve conflicts" },
      { status: 500 }
    );
  }
}

