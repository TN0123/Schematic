import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    } else {
      // Clear sync data when disabling
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

