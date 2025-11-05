import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { normalizeUrls } from "@/lib/url";
import { recordEventAction } from "@/lib/habit-ingestion";
import { invalidateAllUserCaches } from "@/lib/cache-utils";
import { getGoogleCalendarClient } from "@/lib/google-calendar-sync";
import { convertToGoogleDateTime } from "@/lib/timezone";
import { generateSyncHash } from "@/lib/sync-conflict-resolver";

// Helper function to update Google Calendar event
async function updateGoogleCalendarEvent(event: any, userId: string): Promise<void> {
  try {
    const syncedEvent = await prisma.syncedEvent.findUnique({
      where: { localEventId: event.id },
    });

    if (!syncedEvent) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarId: true },
    });

    if (!user?.googleCalendarId) return;

    const client = await getGoogleCalendarClient(userId);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const googleEvent = {
      summary: event.title,
      start: convertToGoogleDateTime(event.start, userTimezone),
      end: convertToGoogleDateTime(event.end, userTimezone),
    };

    await client.updateEvent(user.googleCalendarId, syncedEvent.googleEventId, googleEvent);

    // Update sync hash
    const newHash = generateSyncHash({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      links: event.links || [],
    });

    await prisma.syncedEvent.update({
      where: { id: syncedEvent.id },
      data: { syncHash: newHash, lastSyncedAt: new Date() },
    });
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
  }
}

// Helper function to delete Google Calendar event
async function deleteGoogleCalendarEvent(eventId: string, userId: string): Promise<void> {
  try {
    const syncedEvent = await prisma.syncedEvent.findUnique({
      where: { localEventId: eventId },
    });

    if (!syncedEvent) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleCalendarId: true },
    });

    if (!user?.googleCalendarId) return;

    const client = await getGoogleCalendarClient(userId);
    await client.deleteEvent(user.googleCalendarId, syncedEvent.googleEventId);

    // Delete sync mapping
    await prisma.syncedEvent.delete({
      where: { id: syncedEvent.id },
    });
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;

    if (id === "bulk") {
      const body = await req.json();
      const { ids } = body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: "No event IDs provided" },
          { status: 400 }
        );
      }

      // Fetch events before deletion to record habit actions
      const eventsToDelete = await prisma.event.findMany({
        where: {
          userId: session.user.id,
          id: { in: ids },
        },
      });

      const deletedEvents = await prisma.event.deleteMany({
        where: {
          userId: session.user.id,
          id: { in: ids },
        },
      });

      // Record habit actions for deleted events
      eventsToDelete.forEach(event => {
        recordEventAction(session.user.id, 'deleted', {
          title: event.title,
          start: event.start,
          end: event.end,
        }, event.id).catch(err => console.error('Failed to record habit action:', err));
      });

      // Invalidate cache asynchronously (don't await to avoid blocking)
      invalidateAllUserCaches(session.user.id).catch(err => 
        console.error('Failed to invalidate cache:', err)
      );

      // Delete from Google Calendar if synced (don't await to avoid blocking)
      eventsToDelete.forEach(event => {
        deleteGoogleCalendarEvent(event.id, session.user.id).catch(err => 
          console.error('Failed to delete Google Calendar event:', err)
        );
      });

      return NextResponse.json(deletedEvents, { status: 200 });
    } else {
      // Fetch event before deletion to record habit action
      const eventToDelete = await prisma.event.findUnique({
        where: { id: id, userId: session.user.id },
      });

      const event = await prisma.event.delete({
        where: { id: id, userId: session.user.id },
      });

      // Record habit action for deleted event
      if (eventToDelete) {
        recordEventAction(session.user.id, 'deleted', {
          title: eventToDelete.title,
          start: eventToDelete.start,
          end: eventToDelete.end,
        }, eventToDelete.id).catch(err => console.error('Failed to record habit action:', err));
      }

      // Invalidate cache asynchronously (don't await to avoid blocking)
      invalidateAllUserCaches(session.user.id).catch(err => 
        console.error('Failed to invalidate cache:', err)
      );

      // Delete from Google Calendar if synced (don't await to avoid blocking)
      deleteGoogleCalendarEvent(id, session.user.id).catch(err => 
        console.error('Failed to delete Google Calendar event:', err)
      );

      return NextResponse.json(event, { status: 200 });
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Error deleting event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const { title, start, end, links } = await req.json();
    const normalizedLinks = normalizeUrls(links);

    // First, verify the event exists and belongs to the user
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent || existingEvent.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Event not found or unauthorized" },
        { status: 404 }
      );
    }

    // Now update the event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
        links: Array.isArray(normalizedLinks) ? normalizedLinks : undefined,
      },
    });

    // Record habit action for updated event
    recordEventAction(session.user.id, 'updated', {
      title: updatedEvent.title,
      start: updatedEvent.start,
      end: updatedEvent.end,
    }, updatedEvent.id).catch(err => console.error('Failed to record habit action:', err));

    // Invalidate cache asynchronously (don't await to avoid blocking)
    invalidateAllUserCaches(session.user.id).catch(err => 
      console.error('Failed to invalidate cache:', err)
    );

    // Update Google Calendar event if synced (don't await to avoid blocking)
    updateGoogleCalendarEvent(updatedEvent, session.user.id).catch(err => 
      console.error('Failed to update Google Calendar event:', err)
    );

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Error updating event" },
      { status: 500 }
    );
  }
}
