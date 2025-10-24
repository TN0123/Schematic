import prisma from '@/lib/prisma';
import { GoogleCalendarClient, GoogleCalendarEvent, GoogleCalendar } from './google-calendar-client';
import { convertToGoogleDateTime, convertFromGoogleDateTime, isAllDayEvent } from './timezone';
import { generateSyncHash, detectConflicts, SyncConflict, SyncStats } from './sync-conflict-resolver';
import { Event } from '@/app/schedule/types';
import { recordEventAction } from './habit-ingestion';
import { invalidateAllUserCaches } from './cache-utils';

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: SyncConflict[];
  errors: string[];
}

export interface InitialSyncResult {
  conflicts: SyncConflict[];
  stats: SyncStats;
  success: boolean;
  errors: string[];
}

export async function getGoogleCalendarClient(userId: string): Promise<GoogleCalendarClient> {
  const { GoogleCalendarClient } = await import('./google-calendar-client');
  return GoogleCalendarClient.createForUser(userId);
}

export async function listUserCalendars(userId: string): Promise<GoogleCalendar[]> {
  try {
    const client = await getGoogleCalendarClient(userId);
    return await client.listCalendars();
  } catch (error) {
    console.error('Error listing user calendars:', error);
    throw new Error('Failed to fetch calendars. Please ensure you have granted calendar permissions.');
  }
}

export async function performInitialSync(
  userId: string,
  calendarId: string
): Promise<InitialSyncResult> {
  try {
    const client = await getGoogleCalendarClient(userId);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Fetch local events
    const localEvents = await prisma.event.findMany({
      where: { userId },
      orderBy: { start: 'asc' },
    });
    
    // Fetch Google Calendar events
    const { events: googleEvents } = await client.listEvents(calendarId);
    
    // Detect conflicts
    const conflicts = detectConflicts(
      localEvents.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        links: e.links || [],
      })),
      googleEvents,
      userTimezone
    );
    
    const stats: SyncStats = {
      local: localEvents.length,
      google: googleEvents.length,
      conflicts: conflicts.length,
      toMerge: localEvents.length + googleEvents.length - conflicts.length,
    };
    
    return {
      conflicts,
      stats,
      success: true,
      errors: [],
    };
  } catch (error) {
    console.error('Error performing initial sync:', error);
    return {
      conflicts: [],
      stats: { local: 0, google: 0, conflicts: 0, toMerge: 0 },
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function performIncrementalSync(userId: string): Promise<SyncResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: true,
        googleCalendarSyncToken: true,
      },
    });
    
    if (!user?.googleCalendarSyncEnabled || !user.googleCalendarId) {
      return { success: true, synced: 0, conflicts: [], errors: [] };
    }
    
    const client = await getGoogleCalendarClient(userId);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Fetch changes from Google Calendar
    const { events: googleEvents, nextSyncToken } = await client.listEvents(
      user.googleCalendarId,
      undefined,
      undefined,
      user.googleCalendarSyncToken || undefined
    );
    
    let synced = 0;
    const errors: string[] = [];
    
    // Process each Google event
    for (const googleEvent of googleEvents) {
      try {
        await processGoogleEvent(googleEvent, userId, user.googleCalendarId, userTimezone);
        synced++;
      } catch (error) {
        console.error(`Error processing Google event ${googleEvent.id}:`, error);
        errors.push(`Failed to sync event: ${googleEvent.summary}`);
      }
    }
    
    // Update sync token
    if (nextSyncToken) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleCalendarSyncToken: nextSyncToken,
          googleCalendarLastSyncAt: new Date(),
        },
      });
    }
    
    return { success: true, synced, conflicts: [], errors };
  } catch (error) {
    console.error('Error performing incremental sync:', error);
    return {
      success: false,
      synced: 0,
      conflicts: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

async function processGoogleEvent(
  googleEvent: GoogleCalendarEvent,
  userId: string,
  calendarId: string,
  userTimezone: string
): Promise<void> {
  // Check if we already have this event synced
  const existingSync = await prisma.syncedEvent.findFirst({
    where: {
      userId,
      googleEventId: googleEvent.id,
      googleCalendarId: calendarId,
    },
  });
  
  if (existingSync) {
    // Update existing event
    const localEvent = await prisma.event.findUnique({
      where: { id: existingSync.localEventId },
    });
    
    if (localEvent) {
      const startDate = convertFromGoogleDateTime(googleEvent.start, userTimezone);
      const endDate = convertFromGoogleDateTime(googleEvent.end, userTimezone);
      
      await prisma.event.update({
        where: { id: localEvent.id },
        data: {
          title: googleEvent.summary,
          start: startDate,
          end: endDate,
        },
      });
      
      // Update sync hash
      const newHash = generateSyncHash({
        id: localEvent.id,
        title: googleEvent.summary,
        start: startDate,
        end: endDate,
        links: localEvent.links || [],
      });
      
      await prisma.syncedEvent.update({
        where: { id: existingSync.id },
        data: {
          syncHash: newHash,
          lastSyncedAt: new Date(),
        },
      });
    }
  } else {
    // Create new local event
    const startDate = convertFromGoogleDateTime(googleEvent.start, userTimezone);
    const endDate = convertFromGoogleDateTime(googleEvent.end, userTimezone);
    
    const newEvent = await prisma.event.create({
      data: {
        title: googleEvent.summary,
        start: startDate,
        end: endDate,
        userId,
      },
    });
    
    // Create sync mapping
    const syncHash = generateSyncHash({
      id: newEvent.id,
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      links: [],
    });
    
    await prisma.syncedEvent.create({
      data: {
        userId,
        localEventId: newEvent.id,
        googleEventId: googleEvent.id,
        googleCalendarId: calendarId,
        syncHash,
      },
    });
    
    // Record habit action
    recordEventAction(userId, 'created', {
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
    }, newEvent.id).catch(err => console.error('Failed to record habit action:', err));
  }
}

export async function pushEventToGoogle(eventId: string, userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: true,
      },
    });
    
    if (!user?.googleCalendarSyncEnabled || !user.googleCalendarId) {
      return null;
    }
    
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    const client = await getGoogleCalendarClient(userId);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const googleEvent = {
      summary: event.title,
      start: convertToGoogleDateTime(event.start, userTimezone),
      end: convertToGoogleDateTime(event.end, userTimezone),
      description: event.links?.length ? `Links: ${event.links.join(', ')}` : undefined,
    };
    
    const createdEvent = await client.createEvent(user.googleCalendarId, googleEvent);
    
    // Create sync mapping
    const syncHash = generateSyncHash({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      links: event.links || [],
    });
    
    await prisma.syncedEvent.create({
      data: {
        userId,
        localEventId: event.id,
        googleEventId: createdEvent.id,
        googleCalendarId: user.googleCalendarId,
        syncHash,
      },
    });
    
    return createdEvent.id;
  } catch (error) {
    console.error('Error pushing event to Google:', error);
    throw error;
  }
}

export async function pullEventFromGoogle(
  googleEventId: string,
  calendarId: string,
  userId: string
): Promise<void> {
  try {
    const client = await getGoogleCalendarClient(userId);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const googleEvent = await client.getEvent(calendarId, googleEventId);
    
    const startDate = convertFromGoogleDateTime(googleEvent.start, userTimezone);
    const endDate = convertFromGoogleDateTime(googleEvent.end, userTimezone);
    
    const newEvent = await prisma.event.create({
      data: {
        title: googleEvent.summary,
        start: startDate,
        end: endDate,
        userId,
      },
    });
    
    // Create sync mapping
    const syncHash = generateSyncHash({
      id: newEvent.id,
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
      links: [],
    });
    
    await prisma.syncedEvent.create({
      data: {
        userId,
        localEventId: newEvent.id,
        googleEventId: googleEvent.id,
        googleCalendarId: calendarId,
        syncHash,
      },
    });
    
    // Record habit action
    recordEventAction(userId, 'created', {
      title: newEvent.title,
      start: newEvent.start,
      end: newEvent.end,
    }, newEvent.id).catch(err => console.error('Failed to record habit action:', err));
    
    // Invalidate cache
    invalidateAllUserCaches(userId).catch(err => 
      console.error('Failed to invalidate cache:', err)
    );
  } catch (error) {
    console.error('Error pulling event from Google:', error);
    throw error;
  }
}

export async function deleteEventFromGoogle(
  googleEventId: string,
  calendarId: string,
  userId: string
): Promise<void> {
  try {
    const client = await getGoogleCalendarClient(userId);
    await client.deleteEvent(calendarId, googleEventId);
  } catch (error) {
    console.error('Error deleting event from Google:', error);
    throw error;
  }
}

export async function syncTodoEvent(todoItem: any, userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: true,
      },
    });
    
    if (!user?.googleCalendarSyncEnabled || !user.googleCalendarId || !todoItem.dueDate || !todoItem.dueTime) {
      return null;
    }
    
    const client = await getGoogleCalendarClient(userId);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create 30-minute event for the todo
    const [hours, minutes] = todoItem.dueTime.split(':').map(Number);
    const [year, month, day] = todoItem.dueDate.split('-').map(Number);
    
    const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    
    const googleEvent = {
      summary: todoItem.text || 'Untitled task',
      start: convertToGoogleDateTime(startDate, userTimezone),
      end: convertToGoogleDateTime(endDate, userTimezone),
    };
    
    const createdEvent = await client.createEvent(user.googleCalendarId, googleEvent);
    
    return createdEvent.id;
  } catch (error) {
    console.error('Error syncing todo event:', error);
    throw error;
  }
}

