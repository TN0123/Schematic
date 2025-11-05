import { NextRequest, NextResponse } from "next/server";
import { performIncrementalSync } from "@/lib/google-calendar-sync";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Entry log with request metadata
    console.log('[GCAL Webhook] Incoming request', {
      method: req.method,
      url: req.url,
      forwardedFor: req.headers.get('x-forwarded-for') || null,
      cfConnectingIp: req.headers.get('cf-connecting-ip') || null,
      host: req.headers.get('host') || null,
    });

    // Verify this is a valid Google Calendar webhook
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceId = req.headers.get('x-goog-resource-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const channelToken = req.headers.get('x-goog-channel-token');
    
    // Log webhook details for debugging
    console.log('[GCAL Webhook] Headers received:', {
      channelId,
      resourceId,
      resourceState,
      channelToken,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
    });
    
    // Verify required headers are present
    if (!channelId || !resourceId || !resourceState) {
      console.error('[GCAL Webhook] Invalid webhook headers:', {
        channelId,
        resourceId,
        resourceState,
      });
      return NextResponse.json({ error: 'Invalid webhook headers' }, { status: 400 });
    }
    
    // Extract user ID from the channel token
    const userId = channelToken;
    if (!userId) {
      console.error('[GCAL Webhook] No user ID in webhook token');
      return NextResponse.json({ error: 'No user ID in webhook token' }, { status: 400 });
    }
    
    // Verify the user exists and has sync enabled
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          googleCalendarSyncEnabled: true,
          googleCalendarId: true,
          googleCalendarWatchChannelId: true,
        },
      });
      
      if (!user) {
        console.error(`[GCAL Webhook] User ${userId} not found`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      if (!user.googleCalendarSyncEnabled) {
        console.log(`[GCAL Webhook] Sync disabled for user ${userId}, ignoring webhook`);
        return NextResponse.json({ success: true, message: 'Sync disabled' });
      }
      
      if (!user.googleCalendarId) {
        console.error(`[GCAL Webhook] No calendar ID for user ${userId}`);
        return NextResponse.json({ error: 'No calendar configured' }, { status: 400 });
      }
      
      // Verify the channel ID matches what we expect
      if (user.googleCalendarWatchChannelId !== channelId) {
        console.warn(`[GCAL Webhook] Channel ID mismatch for user ${userId}. Expected: ${user.googleCalendarWatchChannelId}, Got: ${channelId}`);
        // Don't fail the request, but log the mismatch
      }
      
      console.log(`[GCAL Webhook] Processing for user ${userId}, calendar ${user.googleCalendarId}`, {
        resourceId,
        resourceState,
      });
    } catch (error) {
      console.error(`[GCAL Webhook] Error validating user ${userId}:`, error);
      return NextResponse.json({ error: 'User validation failed' }, { status: 500 });
    }
    
    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync notification - perform full sync
        console.log(`[GCAL Webhook] Resource state=sync for user ${userId}`);
        break;
        
      case 'update':
        // Calendar was updated - perform incremental sync
        console.log(`[GCAL Webhook] Resource state=update for user ${userId}`);
        break;
        
      case 'exists':
        // Calendar exists notification - perform incremental sync
        console.log(`[GCAL Webhook] Resource state=exists for user ${userId}`);
        break;
        
      case 'delete':
        // Calendar was deleted - stop watching
        console.log(`[GCAL Webhook] Resource state=delete for user ${userId}`);
        // TODO: Handle calendar deletion
        return NextResponse.json({ success: true });
        
      default:
        console.log(`[GCAL Webhook] Unknown resource state: ${resourceState} for user ${userId}`);
        break;
    }
    
    // Perform incremental sync for the user
    try {
      const result = await performIncrementalSync(userId);
      
      console.log(`[GCAL Webhook] Sync completed for user ${userId}:`, {
        success: result.success,
        synced: result.synced,
        deleted: result.deleted,
        errors: result.errors,
      });
      
      return NextResponse.json({ 
        success: true, 
        synced: result.synced,
        deleted: result.deleted,
        errors: result.errors 
      });
    } catch (error) {
      console.error(`[GCAL Webhook] Sync failed for user ${userId}:`, error);
      return NextResponse.json({ 
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[GCAL Webhook] Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification (optional)
export async function GET(req: NextRequest) {
  const channelId = req.headers.get('x-goog-channel-id');
  const resourceId = req.headers.get('x-goog-resource-id');
  console.log('[GCAL Webhook] GET verification ping', {
    method: req.method,
    url: req.url,
    channelId,
    resourceId,
    forwardedFor: req.headers.get('x-forwarded-for') || null,
  });
  
  return NextResponse.json({ 
    message: 'Webhook endpoint is active',
    channelId,
    resourceId,
  });
}

