import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";
import { setupGoogleCalendarWatch, stopGoogleCalendarWatch } from "@/lib/google-calendar-sync";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: true,
        googleCalendarLastSyncAt: true,
      },
    });

    return NextResponse.json({
      enabled: user?.googleCalendarSyncEnabled || false,
      calendarId: user?.googleCalendarId || null,
      lastSyncAt: user?.googleCalendarLastSyncAt || null,
    });
  } catch (error) {
    console.error("Error fetching sync settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { enabled, calendarId } = await req.json();

    if (enabled && !calendarId) {
      return NextResponse.json(
        { error: "Calendar ID is required when enabling sync" },
        { status: 400 }
      );
    }

    const updateData: any = {
      googleCalendarSyncEnabled: enabled,
    };

    if (enabled) {
      updateData.googleCalendarId = calendarId;
      
      // Set up watch channel for real-time sync
      try {
        const watchResponse = await setupGoogleCalendarWatch(session.user.id, calendarId);
        console.log(`Watch channel set up for user ${session.user.id}:`, watchResponse);
      } catch (error) {
        console.error(`Failed to set up watch channel for user ${session.user.id}:`, error);
        // Continue with sync setup even if watch channel fails
        // The user can still use manual sync
      }
    } else {
      // Stop watch channel and clear sync data when disabling
      try {
        await stopGoogleCalendarWatch(session.user.id);
      } catch (error) {
        console.error(`Failed to stop watch channel for user ${session.user.id}:`, error);
        // Continue with cleanup even if stopping watch channel fails
      }
      
      updateData.googleCalendarId = null;
      updateData.googleCalendarSyncToken = null;
      updateData.googleCalendarLastSyncAt = null;
      updateData.googleCalendarWatchChannelId = null;
      updateData.googleCalendarWatchExpiration = null;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    // If disabling sync, also clean up synced events
    if (!enabled) {
      await prisma.syncedEvent.deleteMany({
        where: { userId: session.user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating sync settings:", error);
    return NextResponse.json(
      { error: "Failed to update sync settings" },
      { status: 500 }
    );
  }
}

