import prisma from '@/lib/prisma';
import { HabitType } from '@prisma/client';

interface EventData {
  title: string;
  start: Date;
  end: Date;
}

interface Centroid {
  avgHour: number;
  avgMinute: number;
  avgDuration: number;
}

interface TimeSlotHistogram {
  [key: string]: number; // Format: "DAY_HOUR" -> count
}

/**
 * Classify event into habit type using simple heuristics
 */
function classifyEventType(eventData: EventData): HabitType | null {
  const title = eventData.title.toLowerCase();
  const hour = eventData.start.getHours();
  const duration = (eventData.end.getTime() - eventData.start.getTime()) / (1000 * 60); // in minutes

  // Meal patterns
  if (
    title.match(/\b(breakfast|lunch|dinner|brunch|meal|eat|food|restaurant|cafe|coffee)\b/) ||
    ((hour >= 7 && hour <= 9) || (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 21)) && duration <= 90
  ) {
    return HabitType.MEAL;
  }

  // Workout patterns
  if (
    title.match(/\b(gym|workout|exercise|run|yoga|fitness|training|cycling|swimming|sports)\b/)
  ) {
    return HabitType.WORKOUT;
  }

  // Meeting patterns
  if (
    title.match(/\b(meeting|call|sync|standup|1:1|one-on-one|interview|review|demo)\b/) ||
    (title.includes('with') && duration >= 15 && duration <= 120)
  ) {
    return HabitType.MEETING;
  }

  // Commute patterns
  if (
    title.match(/\b(commute|drive|transit|bus|train|subway|travel to|heading to)\b/) ||
    ((hour >= 7 && hour <= 10) || (hour >= 16 && hour <= 19)) && duration >= 15 && duration <= 120
  ) {
    return HabitType.COMMUTE;
  }

  // Work block patterns
  if (
    title.match(/\b(work|focus|deep work|coding|development|writing|planning|project|meeting)\b/) ||
    (duration >= 60 && hour >= 9 && hour <= 18)
  ) {
    return HabitType.WORK_BLOCK;
  }

  // Personal patterns
  if (
    title.match(/\b(personal|hobby|reading|meditation|relaxation|family|friends|errands|shopping)\b/)
  ) {
    return HabitType.PERSONAL;
  }

  return null;
}

/**
 * Extract time features from event
 */
function extractTimeFeatures(eventData: EventData) {
  const start = eventData.start;
  const dayOfWeek = start.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = start.getHours();
  const minute = start.getMinutes();
  const duration = (eventData.end.getTime() - eventData.start.getTime()) / (1000 * 60); // in minutes

  return {
    dayOfWeek,
    hour,
    minute,
    duration,
    timeSlotKey: `${dayOfWeek}_${hour}`, // e.g., "1_14" for Monday 2pm
  };
}

/**
 * Update habit profile with fast constant-time updates
 */
export async function updateHabitProfileFast(userId: string, eventData: EventData) {
  try {
    // Skip if user has disabled habit learning
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { habitLearningEnabled: true },
    });

    if (!user?.habitLearningEnabled) {
      return;
    }

    // Classify the event
    const habitType = classifyEventType(eventData);
    if (!habitType) {
      return; // Skip events that don't match any habit type
    }

    // Extract time features
    const { hour, minute, duration, timeSlotKey } = extractTimeFeatures(eventData);

    // Get existing profile or create new one
    const existingProfile = await prisma.habitProfile.findUnique({
      where: {
        userId_habitType: {
          userId,
          habitType,
        },
      },
    });

    if (existingProfile) {
      // Update existing profile with incremental calculations
      const oldCount = existingProfile.count;
      const newCount = oldCount + 1;

      // Parse existing data
      const oldCentroid = existingProfile.centroid as unknown as Centroid;
      const oldHistogram = existingProfile.timeSlotHistogram as unknown as TimeSlotHistogram;

      // Incremental mean update for centroid
      const newCentroid: Centroid = {
        avgHour: (oldCentroid.avgHour * oldCount + hour) / newCount,
        avgMinute: (oldCentroid.avgMinute * oldCount + minute) / newCount,
        avgDuration: (oldCentroid.avgDuration * oldCount + duration) / newCount,
      };

      // Update histogram
      const newHistogram = { ...oldHistogram };
      newHistogram[timeSlotKey] = (newHistogram[timeSlotKey] || 0) + 1;

      // Calculate confidence score (0-1 based on count and variance)
      // Higher count = higher confidence, capped at 1.0
      const confidenceScore = Math.min(1.0, newCount / 30); // Reaches max confidence after 30 events

      // Update profile
      await prisma.habitProfile.update({
        where: { id: existingProfile.id },
        data: {
          count: newCount,
          centroid: newCentroid as any,
          timeSlotHistogram: newHistogram as any,
          confidenceScore,
        },
      });
    } else {
      // Create new profile
      const centroid: Centroid = {
        avgHour: hour,
        avgMinute: minute,
        avgDuration: duration,
      };

      const histogram: TimeSlotHistogram = {
        [timeSlotKey]: 1,
      };

      await prisma.habitProfile.create({
        data: {
          userId,
          habitType,
          count: 1,
          centroid: centroid as any,
          timeSlotHistogram: histogram as any,
          confidenceScore: 1 / 30, // Initial low confidence
        },
      });
    }
  } catch (error) {
    console.error('Error updating habit profile:', error);
    // Don't throw - this is a non-critical feature
  }
}

/**
 * Get habit-based suggestions for a user
 */
export async function getHabitBasedSuggestions(
  userId: string,
  timezone: string,
  availableSlots: Array<{ start: Date; end: Date }>
) {
  try {
    // Get user's habit profiles, ordered by confidence
    const profiles = await prisma.habitProfile.findMany({
      where: {
        userId,
        confidenceScore: { gte: 0.3 }, // Only include habits with at least 30% confidence
      },
      orderBy: {
        confidenceScore: 'desc',
      },
      take: 10, // Top 10 habits
    });

    const suggestions: Array<{
      title: string;
      start: Date;
      end: Date;
      habitType: HabitType;
      confidence: number;
    }> = [];

    for (const profile of profiles) {
      const centroid = profile.centroid as unknown as Centroid;
      
      // Find slots that match the habit's typical time
      for (const slot of availableSlots) {
        const slotHour = slot.start.getHours();
        const slotMinute = slot.start.getMinutes();
        
        // Check if slot time is close to habit centroid time (within 2 hours)
        const hourDiff = Math.abs(slotHour - centroid.avgHour);
        if (hourDiff <= 2) {
          // Calculate slot fit score
          const slotFit = 1 - (hourDiff / 2); // 1.0 = perfect match, 0.5 = 2 hours off
          const score = profile.confidenceScore * slotFit;
          
          // Generate suggestion
          const suggestedStart = new Date(slot.start);
          suggestedStart.setHours(Math.floor(centroid.avgHour), Math.floor(centroid.avgMinute), 0, 0);
          
          const suggestedEnd = new Date(suggestedStart);
          suggestedEnd.setMinutes(suggestedEnd.getMinutes() + centroid.avgDuration);
          
          // Ensure suggestion fits within the available slot
          if (suggestedStart >= slot.start && suggestedEnd <= slot.end) {
            suggestions.push({
              title: getHabitTitle(profile.habitType),
              start: suggestedStart,
              end: suggestedEnd,
              habitType: profile.habitType,
              confidence: score,
            });
          }
        }
      }
    }

    // Sort by confidence score and return top 5
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  } catch (error) {
    console.error('Error getting habit suggestions:', error);
    return [];
  }
}

/**
 * Generate a title for a habit type
 */
function getHabitTitle(habitType: HabitType): string {
  const titles: Record<HabitType, string> = {
    [HabitType.MEAL]: 'Meal Time',
    [HabitType.WORKOUT]: 'Workout',
    [HabitType.MEETING]: 'Meeting',
    [HabitType.COMMUTE]: 'Commute',
    [HabitType.WORK_BLOCK]: 'Focus Time',
    [HabitType.PERSONAL]: 'Personal Time',
  };
  return titles[habitType];
}


