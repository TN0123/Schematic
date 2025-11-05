import { NextRequest, NextResponse } from "next/server";
import { 
  getUsersWithExpiringWatchChannels, 
  renewGoogleCalendarWatch 
} from "@/lib/google-calendar-sync";

export async function GET(req: NextRequest) {
  // Verify this is a cron request (optional security check)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get users with expiring watch channels
    const userIds = await getUsersWithExpiringWatchChannels();
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process users in batches to avoid rate limits
    const batchSize = 3; // Smaller batch size for renewal
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (userId) => {
        try {
          await renewGoogleCalendarWatch(userId);
          results.processed++;
          results.successful++;
        } catch (error) {
          results.processed++;
          results.failed++;
          results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < userIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    return NextResponse.json({
      message: 'Watch channel renewal completed',
      results,
    });

  } catch (error) {
    console.error('Error renewing watch channels:', error);
    return NextResponse.json({ 
      error: 'Watch channel renewal failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

