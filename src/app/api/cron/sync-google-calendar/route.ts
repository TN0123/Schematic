import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { performIncrementalSync } from "@/lib/google-calendar-sync";

export async function GET(req: NextRequest) {
  // Verify this is a cron request (optional security check)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users with sync enabled
    const users = await prisma.user.findMany({
      where: {
        googleCalendarSyncEnabled: true,
        googleCalendarId: { not: null },
      },
      select: {
        id: true,
        googleCalendarLastSyncAt: true,
      },
    });

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process users in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (user) => {
        try {
          const result = await performIncrementalSync(user.id);
          results.processed++;
          
          if (result.success) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`User ${user.id}: ${result.errors.join(', ')}`);
          }
        } catch (error) {
          results.processed++;
          results.failed++;
          results.errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} users`,
      results,
    });
  } catch (error) {
    console.error('Error in sync cron job:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

