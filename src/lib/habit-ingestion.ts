import prisma from '@/lib/prisma';
import { updateHabitProfileFast } from './habit-profile';

export type ActionType = 'created' | 'updated' | 'deleted' | 'accepted' | 'rejected';

interface EventData {
  title: string;
  start: Date;
  end: Date;
}

/**
 * Record an event action and trigger habit profile update
 */
export async function recordEventAction(
  userId: string,
  actionType: ActionType,
  eventData: EventData,
  eventId?: string
) {
  try {
    // Write to EventAction table
    await prisma.eventAction.create({
      data: {
        userId,
        eventId,
        actionType,
        eventTitle: eventData.title,
        eventStart: eventData.start,
        eventEnd: eventData.end,
      },
    });

    // Trigger real-time habit profile update for relevant actions
    // Only update for created, updated, and accepted actions
    // Skip deleted and rejected actions
    if (actionType === 'created' || actionType === 'updated' || actionType === 'accepted') {
      await updateHabitProfileFast(userId, eventData);
    }
  } catch (error) {
    console.error('Error recording event action:', error);
    // Don't throw - this is a non-critical feature
  }
}

/**
 * Record multiple event actions in batch (for bulk operations)
 */
export async function recordEventActionsBatch(
  userId: string,
  actions: Array<{
    actionType: ActionType;
    eventData: EventData;
    eventId?: string;
  }>
) {
  try {
    // Write all actions to EventAction table
    await prisma.eventAction.createMany({
      data: actions.map(action => ({
        userId,
        eventId: action.eventId,
        actionType: action.actionType,
        eventTitle: action.eventData.title,
        eventStart: action.eventData.start,
        eventEnd: action.eventData.end,
      })),
    });

    // Update habit profiles for relevant actions
    for (const action of actions) {
      if (
        action.actionType === 'created' ||
        action.actionType === 'updated' ||
        action.actionType === 'accepted'
      ) {
        await updateHabitProfileFast(userId, action.eventData);
      }
    }
  } catch (error) {
    console.error('Error recording event actions batch:', error);
    // Don't throw - this is a non-critical feature
  }
}


