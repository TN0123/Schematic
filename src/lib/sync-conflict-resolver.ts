import { Event } from '@/app/schedule/types';
import { GoogleCalendarEvent } from './google-calendar-client';
import { convertFromGoogleDateTime, isAllDayEvent } from './timezone';

export interface SyncConflict {
  id: string;
  localEvent: Event;
  googleEvent: GoogleCalendarEvent;
  conflictType: 'title' | 'time' | 'both';
  description: string;
}

export interface SyncDecision {
  eventId: string;
  action: 'useLocal' | 'useGoogle' | 'skip';
}

export interface SyncStats {
  local: number;
  google: number;
  conflicts: number;
  toMerge: number;
}

export function generateSyncHash(event: Event): string {
  const data = {
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    links: event.links?.sort() || [],
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function detectConflicts(
  localEvents: Event[],
  googleEvents: GoogleCalendarEvent[],
  userTimezone: string
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];
  
  // Create maps for efficient lookup
  const localByTime = new Map<string, Event[]>();
  const googleByTime = new Map<string, GoogleCalendarEvent[]>();
  
  // Group local events by time window (rounded to nearest 15 minutes)
  localEvents.forEach(event => {
    const timeKey = getTimeKey(event.start, event.end);
    if (!localByTime.has(timeKey)) {
      localByTime.set(timeKey, []);
    }
    localByTime.get(timeKey)!.push(event);
  });
  
  // Group Google events by time window
  googleEvents.forEach(event => {
    const startDate = convertFromGoogleDateTime(event.start, userTimezone);
    const endDate = convertFromGoogleDateTime(event.end, userTimezone);
    const timeKey = getTimeKey(startDate, endDate);
    if (!googleByTime.has(timeKey)) {
      googleByTime.set(timeKey, []);
    }
    googleByTime.get(timeKey)!.push(event);
  });
  
  // Find conflicts by comparing events in the same time windows
  for (const [timeKey, localEventsInWindow] of localByTime) {
    const googleEventsInWindow = googleByTime.get(timeKey) || [];
    
    // Check for conflicts between events in the same time window
    for (const localEvent of localEventsInWindow) {
      for (const googleEvent of googleEventsInWindow) {
        const conflict = detectEventConflict(localEvent, googleEvent, userTimezone);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
  }
  
  return conflicts;
}

function getTimeKey(start: Date, end: Date): string {
  // Round to nearest 15 minutes for grouping
  const startRounded = new Date(start);
  startRounded.setMinutes(Math.floor(startRounded.getMinutes() / 15) * 15);
  startRounded.setSeconds(0);
  startRounded.setMilliseconds(0);
  
  const endRounded = new Date(end);
  endRounded.setMinutes(Math.floor(endRounded.getMinutes() / 15) * 15);
  endRounded.setSeconds(0);
  endRounded.setMilliseconds(0);
  
  return `${startRounded.toISOString()}-${endRounded.toISOString()}`;
}

function detectEventConflict(
  localEvent: Event,
  googleEvent: GoogleCalendarEvent,
  userTimezone: string
): SyncConflict | null {
  const googleStart = convertFromGoogleDateTime(googleEvent.start, userTimezone);
  const googleEnd = convertFromGoogleDateTime(googleEvent.end, userTimezone);
  
  // Check if events overlap in time
  const timeOverlap = localEvent.start < googleEnd && localEvent.end > googleStart;
  
  if (!timeOverlap) {
    return null;
  }
  
  // Check for title conflicts (similar titles)
  const titleSimilarity = calculateStringSimilarity(
    localEvent.title.toLowerCase(),
    googleEvent.summary.toLowerCase()
  );
  
  const hasTimeConflict = Math.abs(localEvent.start.getTime() - googleStart.getTime()) > 5 * 60 * 1000 || // 5 minutes
                         Math.abs(localEvent.end.getTime() - googleEnd.getTime()) > 5 * 60 * 1000;
  
  const hasTitleConflict = titleSimilarity > 0.7; // 70% similarity threshold
  
  if (!hasTimeConflict && !hasTitleConflict) {
    return null;
  }
  
  let conflictType: 'title' | 'time' | 'both';
  if (hasTimeConflict && hasTitleConflict) {
    conflictType = 'both';
  } else if (hasTimeConflict) {
    conflictType = 'time';
  } else {
    conflictType = 'title';
  }
  
  const description = generateConflictDescription(localEvent, googleEvent, conflictType);
  
  return {
    id: `conflict-${localEvent.id}-${googleEvent.id}`,
    localEvent,
    googleEvent,
    conflictType,
    description,
  };
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function generateConflictDescription(
  localEvent: Event,
  googleEvent: GoogleCalendarEvent,
  conflictType: 'title' | 'time' | 'both'
): string {
  const localTime = `${localEvent.start.toLocaleTimeString()} - ${localEvent.end.toLocaleTimeString()}`;
  const googleTime = `${convertFromGoogleDateTime(googleEvent.start, 'UTC').toLocaleTimeString()} - ${convertFromGoogleDateTime(googleEvent.end, 'UTC').toLocaleTimeString()}`;
  
  switch (conflictType) {
    case 'title':
      return `Title conflict: "${localEvent.title}" vs "${googleEvent.summary}"`;
    case 'time':
      return `Time conflict: Local (${localTime}) vs Google (${googleTime})`;
    case 'both':
      return `Both title and time conflict: "${localEvent.title}" (${localTime}) vs "${googleEvent.summary}" (${googleTime})`;
    default:
      return 'Unknown conflict';
  }
}

export function mergeSyncDecisions(
  decisions: SyncDecision[],
  conflicts: SyncConflict[]
): { localToKeep: Event[]; googleToKeep: GoogleCalendarEvent[]; toSkip: string[] } {
  const localToKeep: Event[] = [];
  const googleToKeep: GoogleCalendarEvent[] = [];
  const toSkip: string[] = [];
  
  const decisionMap = new Map(decisions.map(d => [d.eventId, d.action]));
  
  conflicts.forEach(conflict => {
    const decision = decisionMap.get(conflict.id);
    
    if (!decision) {
      // No decision made, skip by default
      toSkip.push(conflict.localEvent.id);
      return;
    }
    
    switch (decision) {
      case 'useLocal':
        localToKeep.push(conflict.localEvent);
        break;
      case 'useGoogle':
        googleToKeep.push(conflict.googleEvent);
        break;
      case 'skip':
        toSkip.push(conflict.localEvent.id);
        break;
    }
  });
  
  return { localToKeep, googleToKeep, toSkip };
}

