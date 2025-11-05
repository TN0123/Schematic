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

    // Count pending sync operations (events that need to be synced)
    const totalEvents = await prisma.event.count({
      where: { userId: session.user.id },
    });
    
    const syncedEvents = await prisma.syncedEvent.count({
      where: { userId: session.user.id },
    });
    
    const pendingSyncCount = totalEvents - syncedEvents;

    // Check for sync health (events that haven't been synced recently)
    const staleSyncCount = await prisma.syncedEvent.count({
      where: {
        userId: session.user.id,
        lastSyncedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
      },
    });

    return NextResponse.json({
      syncEnabled: user?.googleCalendarSyncEnabled || false,
      lastSyncAt: user?.googleCalendarLastSyncAt || null,
      pendingChanges: pendingSyncCount,
      errors: staleSyncCount > 0 ? [`${staleSyncCount} events haven't synced recently`] : [],
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}

