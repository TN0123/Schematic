import prisma from '@/lib/prisma';
import { GoogleCalendarClient, GoogleCalendarEvent, GoogleCalendar } from './google-calendar-client';
import { convertToGoogleDateTime, convertFromGoogleDateTime, isAllDayEvent } from './timezone';
import { generateSyncHash, detectConflicts, SyncConflict, SyncStats } from './sync-conflict-resolver';
import { Event } from '@/app/schedule/types';
import { recordEventAction } from './habit-ingestion';
import { invalidateAllUserCaches } from './cache-utils';

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find existing local event that matches a Google Calendar event
 * This helps prevent duplicates when users unsync and resync
 */
async function findExistingEvent(
  googleEvent: GoogleCalendarEvent,
  userId: string,
  userTimezone: string
): Promise<{ event: any; similarity: number } | null> {
  const googleStart = convertFromGoogleDateTime(googleEvent.start, userTimezone);
  const googleEnd = convertFromGoogleDateTime(googleEvent.end, userTimezone);
  
  // Look for events within a reasonable time window (±30 minutes)
  const timeWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
  const startWindow = new Date(googleStart.getTime() - timeWindow);
  const endWindow = new Date(googleEnd.getTime() + timeWindow);
  
  const existingEvents = await prisma.event.findMany({
    where: {
      userId,
      start: {
        gte: startWindow,
        lte: endWindow,
      },
    },
  });
  
  let bestMatch: { event: any; similarity: number } | null = null;
  let bestSimilarity = 0;
  
  for (const event of existingEvents) {
    // Calculate title similarity
    const titleSimilarity = calculateStringSimilarity(
      event.title.toLowerCase(),
      googleEvent.summary.toLowerCase()
    );
    
    // Calculate time similarity (closer times = higher similarity)
    const timeDiff = Math.abs(event.start.getTime() - googleStart.getTime()) + 
                    Math.abs(event.end.getTime() - googleEnd.getTime());
    const timeSimilarity = Math.max(0, 1 - (timeDiff / (timeWindow * 2)));
    
    // Combined similarity score (weighted: 70% title, 30% time)
    const combinedSimilarity = (titleSimilarity * 0.7) + (timeSimilarity * 0.3);
    
    // Only consider events with at least 60% similarity
    if (combinedSimilarity >= 0.6 && combinedSimilarity > bestSimilarity) {
      bestMatch = { event, similarity: combinedSimilarity };
      bestSimilarity = combinedSimilarity;
    }
  }
  
  return bestMatch;
}

/**
 * Get the correct webhook URL for the current deployment environment
 * Handles preview deployments, production, and local development
 */
function getWebhookUrl(): string {
  // Check if we're in a Vercel environment
  if (process.env.VERCEL_URL) {
    // Vercel preview deployments
    const url = `https://${process.env.VERCEL_URL}/api/google-calendar/webhook`;
    console.log('[GCAL Watch] Using webhook URL from VERCEL_URL', { url });
    return url;
  }
  
  // Check for explicit NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/webhook`;
    console.log('[GCAL Watch] Using webhook URL from NEXT_PUBLIC_APP_URL', { url });
    return url;
  }
  
  // Fallback for local development
  if (process.env.NODE_ENV === 'development') {
    const url = 'http://localhost:3000/api/google-calendar/webhook';
    console.log('[GCAL Watch] Using local webhook URL (development)', { url });
    return url;
  }
  
  // Last resort - this should not happen in production
  throw new Error('Unable to determine webhook URL. Please set NEXT_PUBLIC_APP_URL environment variable.');
}

export interface SyncResult {
  success: boolean;
  synced: number;
  deleted: number;
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
      return { success: true, synced: 0, deleted: 0, conflicts: [], errors: [] };
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
    let deleted = 0;
    const errors: string[] = [];
    
    // Get all currently synced events for this user
    const syncedEvents = await prisma.syncedEvent.findMany({
      where: {
        userId,
        googleCalendarId: user.googleCalendarId,
      },
    });
    
    // Create a set of Google event IDs that still exist
    const existingGoogleEventIds = new Set(googleEvents.map(e => e.id));
    
    // Process each Google event (create/update)
    for (const googleEvent of googleEvents) {
      try {
        await processGoogleEvent(googleEvent, userId, user.googleCalendarId, userTimezone);
        synced++;
      } catch (error) {
        console.error(`Error processing Google event ${googleEvent.id}:`, error);
        errors.push(`Failed to sync event: ${googleEvent.summary}`);
      }
    }
    
    // Remove local events that no longer exist in Google Calendar
    for (const syncedEvent of syncedEvents) {
      if (!existingGoogleEventIds.has(syncedEvent.googleEventId)) {
        try {
          // Get the local event details before deleting
          const localEvent = await prisma.event.findUnique({
            where: { id: syncedEvent.localEventId },
          });
          
          // Delete the local event
          await prisma.event.delete({
            where: { id: syncedEvent.localEventId },
          });
          
          // Delete the sync mapping
          await prisma.syncedEvent.delete({
            where: { id: syncedEvent.id },
          });
          
          console.log(`Deleted local event ${syncedEvent.localEventId} (Google event ${syncedEvent.googleEventId} was deleted)`);
          deleted++;
          
          // Invalidate cache for the deleted event
          if (localEvent) {
            invalidateAllUserCaches(userId).catch(err => 
              console.error('Failed to invalidate cache after deletion:', err)
            );
          }
        } catch (error) {
          console.error(`Error deleting local event ${syncedEvent.localEventId}:`, error);
          errors.push(`Failed to delete event: ${syncedEvent.googleEventId}`);
        }
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
    
    return { success: true, synced, deleted, conflicts: [], errors };
  } catch (error) {
    console.error('Error performing incremental sync:', error);
    return {
      success: false,
      synced: 0,
      deleted: 0,
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
    // Check for existing local event that might be a duplicate
    const existingEventMatch = await findExistingEvent(googleEvent, userId, userTimezone);
    
    if (existingEventMatch) {
      // Found a potential duplicate - create sync mapping for existing event instead of creating new one
      console.log(`Found existing event ${existingEventMatch.event.id} with ${(existingEventMatch.similarity * 100).toFixed(1)}% similarity to Google event ${googleEvent.id}`);
      
      const syncHash = generateSyncHash({
        id: existingEventMatch.event.id,
        title: existingEventMatch.event.title,
        start: existingEventMatch.event.start,
        end: existingEventMatch.event.end,
        links: existingEventMatch.event.links || [],
      });
      
      await prisma.syncedEvent.create({
        data: {
          userId,
          localEventId: existingEventMatch.event.id,
          googleEventId: googleEvent.id,
          googleCalendarId: calendarId,
          syncHash,
        },
      });
      
      // Update the existing event with Google Calendar data if similarity is high enough
      if (existingEventMatch.similarity >= 0.8) {
        const startDate = convertFromGoogleDateTime(googleEvent.start, userTimezone);
        const endDate = convertFromGoogleDateTime(googleEvent.end, userTimezone);
        
        await prisma.event.update({
          where: { id: existingEventMatch.event.id },
          data: {
            title: googleEvent.summary,
            start: startDate,
            end: endDate,
          },
        });
        
        // Update sync hash with new data
        const updatedHash = generateSyncHash({
          id: existingEventMatch.event.id,
          title: googleEvent.summary,
          start: startDate,
          end: endDate,
          links: existingEventMatch.event.links || [],
        });
        
        await prisma.syncedEvent.updateMany({
          where: {
            userId,
            googleEventId: googleEvent.id,
            googleCalendarId: calendarId,
          },
          data: {
            syncHash: updatedHash,
            lastSyncedAt: new Date(),
          },
        });
      }
    } else {
      // No existing event found - create new local event
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
    
    // Check for existing local event that might be a duplicate
    const existingEventMatch = await findExistingEvent(googleEvent, userId, userTimezone);
    
    if (existingEventMatch) {
      // Found a potential duplicate - create sync mapping for existing event instead of creating new one
      console.log(`Found existing event ${existingEventMatch.event.id} with ${(existingEventMatch.similarity * 100).toFixed(1)}% similarity to Google event ${googleEvent.id}`);
      
      const syncHash = generateSyncHash({
        id: existingEventMatch.event.id,
        title: existingEventMatch.event.title,
        start: existingEventMatch.event.start,
        end: existingEventMatch.event.end,
        links: existingEventMatch.event.links || [],
      });
      
      await prisma.syncedEvent.create({
        data: {
          userId,
          localEventId: existingEventMatch.event.id,
          googleEventId: googleEvent.id,
          googleCalendarId: calendarId,
          syncHash,
        },
      });
      
      // Update the existing event with Google Calendar data if similarity is high enough
      if (existingEventMatch.similarity >= 0.8) {
        const startDate = convertFromGoogleDateTime(googleEvent.start, userTimezone);
        const endDate = convertFromGoogleDateTime(googleEvent.end, userTimezone);
        
        await prisma.event.update({
          where: { id: existingEventMatch.event.id },
          data: {
            title: googleEvent.summary,
            start: startDate,
            end: endDate,
          },
        });
        
        // Update sync hash with new data
        const updatedHash = generateSyncHash({
          id: existingEventMatch.event.id,
          title: googleEvent.summary,
          start: startDate,
          end: endDate,
          links: existingEventMatch.event.links || [],
        });
        
        await prisma.syncedEvent.updateMany({
          where: {
            userId,
            googleEventId: googleEvent.id,
            googleCalendarId: calendarId,
          },
          data: {
            syncHash: updatedHash,
            lastSyncedAt: new Date(),
          },
        });
      }
    } else {
      // No existing event found - create new local event
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

export async function setupGoogleCalendarWatch(userId: string, calendarId: string): Promise<{ id: string; resourceId: string; expiration: string }> {
  try {
    const client = await getGoogleCalendarClient(userId);
    
    // Generate unique channel ID
    const channelId = `channel-${userId}-${Date.now()}`;
    
    // Set expiration to 7 days from now (Google's maximum)
    const expiration = Date.now() + (7 * 24 * 60 * 60 * 1000);
    
    // Get the webhook URL - handle different deployment environments
    const webhookUrl = getWebhookUrl();
    
    const watchRequest = {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: userId, // Pass user ID in the token for webhook processing
      expiration: expiration,
    };
    console.log('[GCAL Watch] Creating watch channel', { userId, calendarId, webhookUrl, channelId, expiration });
    
    const watchResponse = await client.watchCalendar(calendarId, watchRequest);
    console.log('[GCAL Watch] Watch channel created', { userId, calendarId, response: watchResponse });
    
    // Store the channel info in the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarWatchChannelId: watchResponse.id,
        googleCalendarWatchExpiration: new Date(parseInt(watchResponse.expiration)),
      },
    });
    
    console.log(`Watch channel created for user ${userId}:`, watchResponse);
    return watchResponse;
  } catch (error) {
    console.error('Error setting up Google Calendar watch:', error);
    throw error;
  }
}

export async function stopGoogleCalendarWatch(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarWatchChannelId: true,
        googleCalendarId: true,
      },
    });
    
    if (!user?.googleCalendarWatchChannelId || !user.googleCalendarId) {
      console.log('[GCAL Watch] No existing watch channel to stop', { userId });
      return; // No watch channel to stop
    }
    
    const client = await getGoogleCalendarClient(userId);
    
    // Stop the watch channel
    console.log('[GCAL Watch] Stopping watch channel', { userId, channelId: user.googleCalendarWatchChannelId, calendarId: user.googleCalendarId });
    await client.stopWatchChannel(user.googleCalendarWatchChannelId, user.googleCalendarId);
    
    // Clear the channel info from the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarWatchChannelId: null,
        googleCalendarWatchExpiration: null,
      },
    });
    
    console.log(`Watch channel stopped for user ${userId}`);
  } catch (error) {
    console.error('Error stopping Google Calendar watch:', error);
    throw error;
  }
}

export async function renewGoogleCalendarWatch(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: true,
        googleCalendarWatchChannelId: true,
        googleCalendarWatchExpiration: true,
      },
    });
    
    if (!user?.googleCalendarSyncEnabled || !user.googleCalendarId) {
      console.log('[GCAL Watch] Renewal skipped, sync disabled or no calendar', { userId });
      return; // Sync not enabled
    }
    
    // Check if watch channel is close to expiration (within 24 hours)
    const now = new Date();
    const expirationDate = user.googleCalendarWatchExpiration;
    
    if (!expirationDate || (expirationDate.getTime() - now.getTime()) > 24 * 60 * 60 * 1000) {
      console.log('[GCAL Watch] Renewal not needed yet', { userId, expirationDate });
      return; // Not close to expiration
    }
    
    // Stop the old watch channel
    if (user.googleCalendarWatchChannelId) {
      console.log('[GCAL Watch] Renewing watch channel: stopping old channel first', { userId, oldChannelId: user.googleCalendarWatchChannelId });
      await stopGoogleCalendarWatch(userId);
    }
    
    // Create a new watch channel
    console.log('[GCAL Watch] Creating new watch channel after renewal', { userId });
    await setupGoogleCalendarWatch(userId, user.googleCalendarId);
    
    console.log(`Watch channel renewed for user ${userId}`);
  } catch (error) {
    console.error('Error renewing Google Calendar watch:', error);
    throw error;
  }
}

export async function getUsersWithExpiringWatchChannels(): Promise<string[]> {
  try {
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const users = await prisma.user.findMany({
      where: {
        googleCalendarSyncEnabled: true,
        googleCalendarWatchChannelId: { not: null },
        googleCalendarWatchExpiration: {
          lte: oneDayFromNow,
        },
      },
      select: {
        id: true,
      },
    });
    
    return users.map(user => user.id);
  } catch (error) {
    console.error('Error getting users with expiring watch channels:', error);
    return [];
  }
}

