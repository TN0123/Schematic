import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { invalidateAllUserCaches } from '@/lib/cache-utils';
import { syncTodoEvent, getGoogleCalendarClient } from '@/lib/google-calendar-sync';

// Helper function to handle todo item sync
async function handleTodoSync(
  currentBulletin: any,
  updatedBulletin: any,
  userId: string
): Promise<void> {
  try {
    const currentItems = currentBulletin?.data?.items || [];
    const updatedItems = updatedBulletin.data?.items || [];

    // Check for items that gained or lost due date + time
    for (const updatedItem of updatedItems) {
      const currentItem = currentItems.find((item: any) => item.id === updatedItem.id);
      
      if (!currentItem) continue;

      const hadDateTime = currentItem.dueDate && currentItem.dueTime;
      const hasDateTime = updatedItem.dueDate && updatedItem.dueTime;

      if (!hadDateTime && hasDateTime) {
        // Item gained date + time, create calendar event
        try {
          const googleEventId = await syncTodoEvent(updatedItem, userId);
          if (googleEventId) {
            // Update the item with the linked event ID
            await prisma.bulletin.update({
              where: { id: updatedBulletin.id },
              data: {
                data: {
                  ...updatedBulletin.data,
                  items: updatedItems.map((item: any) => 
                    item.id === updatedItem.id 
                      ? { ...item, linkedEventId: googleEventId }
                      : item
                  ),
                },
              },
            });
          }
        } catch (error) {
          console.error('Failed to create calendar event for todo:', error);
        }
      } else if (hadDateTime && !hasDateTime) {
        // Item lost date + time, delete calendar event if it exists
        if (currentItem.linkedEventId) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { googleCalendarId: true },
            });

            if (user?.googleCalendarId) {
              const client = await getGoogleCalendarClient(userId);
              await client.deleteEvent(user.googleCalendarId, currentItem.linkedEventId);
            }
          } catch (error) {
            console.error('Failed to delete calendar event for todo:', error);
          }
        }
      } else if (hadDateTime && hasDateTime && 
                 (currentItem.text !== updatedItem.text || 
                  currentItem.dueDate !== updatedItem.dueDate || 
                  currentItem.dueTime !== updatedItem.dueTime)) {
        // Item with date + time was modified, update calendar event
        if (currentItem.linkedEventId) {
          try {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { googleCalendarId: true },
            });

            if (user?.googleCalendarId) {
              const client = await getGoogleCalendarClient(userId);
              const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              
              // Create 30-minute event for the todo
              const [hours, minutes] = updatedItem.dueTime.split(':').map(Number);
              const [year, month, day] = updatedItem.dueDate.split('-').map(Number);
              
              const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
              const endDate = new Date(startDate);
              endDate.setMinutes(endDate.getMinutes() + 30);

              const googleEvent = {
                summary: updatedItem.text || 'Untitled task',
                start: {
                  dateTime: startDate.toISOString(),
                  timeZone: userTimezone,
                },
                end: {
                  dateTime: endDate.toISOString(),
                  timeZone: userTimezone,
                },
              };

              await client.updateEvent(user.googleCalendarId, currentItem.linkedEventId, googleEvent);
            }
          } catch (error) {
            console.error('Failed to update calendar event for todo:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling todo sync:', error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new NextResponse('User not found', { status: 404 });
  }

  const updates = await request.json();
  const id = (await params).id;
  
  // Get the current bulletin to check for todo changes
  const currentBulletin = await prisma.bulletin.findUnique({
    where: { id },
  });

  const bulletin = await prisma.bulletin.update({
    where: { id: id },
    data: updates,
  });

  // Handle todo item sync if this is a todo bulletin
  if (bulletin.type === 'todo' && updates.data?.items) {
    handleTodoSync(currentBulletin, bulletin, user.id).catch(err => 
      console.error('Failed to sync todo items:', err)
    );
  }

  // Invalidate cache asynchronously (don't await to avoid blocking)
  invalidateAllUserCaches(user.id).catch(err => 
    console.error('Failed to invalidate cache:', err)
  );

  return NextResponse.json(bulletin);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new NextResponse('User not found', { status: 404 });
  }

  const id = (await params).id;
  await prisma.bulletin.delete({
    where: { id: id },
  });

  // Invalidate cache asynchronously (don't await to avoid blocking)
  invalidateAllUserCaches(user.id).catch(err => 
    console.error('Failed to invalidate cache:', err)
  );

  return new NextResponse(null, { status: 204 });
}