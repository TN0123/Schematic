import { NextRequest, NextResponse } from "next/server";
import { performIncrementalSync } from "@/lib/google-calendar-sync";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Verify this is a valid Google Calendar webhook
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceId = req.headers.get('x-goog-resource-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const channelToken = req.headers.get('x-goog-channel-token');
    
    // Log webhook details for debugging
    console.log('Google Calendar webhook received:', {
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
      console.error('Invalid webhook headers:', {
        channelId,
        resourceId,
        resourceState,
      });
      return NextResponse.json({ error: 'Invalid webhook headers' }, { status: 400 });
    }
    
    // Extract user ID from the channel token
    const userId = channelToken;
    if (!userId) {
      console.error('No user ID in webhook token');
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
        console.error(`User ${userId} not found`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      if (!user.googleCalendarSyncEnabled) {
        console.log(`Sync disabled for user ${userId}, ignoring webhook`);
        return NextResponse.json({ success: true, message: 'Sync disabled' });
      }
      
      if (!user.googleCalendarId) {
        console.error(`No calendar ID for user ${userId}`);
        return NextResponse.json({ error: 'No calendar configured' }, { status: 400 });
      }
      
      // Verify the channel ID matches what we expect
      if (user.googleCalendarWatchChannelId !== channelId) {
        console.warn(`Channel ID mismatch for user ${userId}. Expected: ${user.googleCalendarWatchChannelId}, Got: ${channelId}`);
        // Don't fail the request, but log the mismatch
      }
      
      console.log(`Processing webhook for user ${userId} with calendar ${user.googleCalendarId}`);
    } catch (error) {
      console.error(`Error validating user ${userId}:`, error);
      return NextResponse.json({ error: 'User validation failed' }, { status: 500 });
    }
    
    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync notification - perform full sync
        console.log(`Initial sync notification for user ${userId}`);
        break;
        
      case 'update':
        // Calendar was updated - perform incremental sync
        console.log(`Update notification for user ${userId}`);
        break;
        
      case 'exists':
        // Calendar exists notification - perform incremental sync
        console.log(`Exists notification for user ${userId}`);
        break;
        
      case 'delete':
        // Calendar was deleted - stop watching
        console.log(`Delete notification for user ${userId}`);
        // TODO: Handle calendar deletion
        return NextResponse.json({ success: true });
        
      default:
        console.log(`Unknown resource state: ${resourceState} for user ${userId}`);
        break;
    }
    
    // Perform incremental sync for the user
    try {
      const result = await performIncrementalSync(userId);
      
      console.log(`Webhook sync completed for user ${userId}:`, {
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
      console.error(`Webhook sync failed for user ${userId}:`, error);
      return NextResponse.json({ 
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error processing Google Calendar webhook:', error);
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
  
  console.log('Google Calendar webhook verification:', {
    channelId,
    resourceId,
  });
  
  return NextResponse.json({ 
    message: 'Webhook endpoint is active',
    channelId,
    resourceId,
  });
}

