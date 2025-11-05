import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  setupGoogleCalendarWatch, 
  stopGoogleCalendarWatch, 
  renewGoogleCalendarWatch,
  getUsersWithExpiringWatchChannels 
} from "@/lib/google-calendar-sync";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { action, calendarId } = await req.json();
    console.log('[GCAL Watch API] Request', { userId: session.user.id, action, calendarId });
    
    switch (action) {
      case 'setup':
        if (!calendarId) {
          return NextResponse.json({ error: 'Calendar ID is required' }, { status: 400 });
        }
        
        const watchResponse = await setupGoogleCalendarWatch(session.user.id, calendarId);
        console.log('[GCAL Watch API] Setup complete', { userId: session.user.id, calendarId, watchResponse });
        return NextResponse.json({ 
          success: true, 
          watchChannel: watchResponse 
        });
        
      case 'stop':
        console.log('[GCAL Watch API] Stop requested', { userId: session.user.id });
        await stopGoogleCalendarWatch(session.user.id);
        console.log('[GCAL Watch API] Stop completed', { userId: session.user.id });
        return NextResponse.json({ success: true });
        
      case 'renew':
        console.log('[GCAL Watch API] Renew requested', { userId: session.user.id });
        await renewGoogleCalendarWatch(session.user.id);
        console.log('[GCAL Watch API] Renew completed', { userId: session.user.id });
        return NextResponse.json({ success: true });
        
      default:
        console.warn('[GCAL Watch API] Invalid action', { action });
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[GCAL Watch API] Error managing watch channel:', error);
    return NextResponse.json({ 
      error: 'Failed to manage watch channel',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get users with expiring watch channels (for admin/monitoring purposes)
    const expiringUsers = await getUsersWithExpiringWatchChannels();
    
    return NextResponse.json({ 
      expiringUsers,
      count: expiringUsers.length 
    });
    
  } catch (error) {
    console.error('Error getting expiring watch channels:', error);
    return NextResponse.json({ 
      error: 'Failed to get expiring watch channels',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

