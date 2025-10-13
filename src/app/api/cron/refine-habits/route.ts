import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { clusterEventsBySemantics, deduplicateHabits } from '@/scripts/schedule/refine-habits';

export async function POST(request: Request) {
  try {
    // Verify this is a cron job request (you can add auth header check if needed)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a job log entry
    const job = await prisma.backgroundJobLog.create({
      data: {
        jobType: 'refine-habits',
        status: 'running',
      },
    });

    let totalProcessed = 0;
    let errorMessage = null;

    try {
      // Get all users with habit learning enabled
      const users = await prisma.user.findMany({
        where: {
          habitLearningEnabled: true,
        },
        select: {
          id: true,
        },
      });

      console.log(`Processing habit refinement for ${users.length} users`);

      for (const user of users) {
        try {
          // Fetch recent event actions (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const eventActions = await prisma.eventAction.findMany({
            where: {
              userId: user.id,
              recordedAt: {
                gte: thirtyDaysAgo,
              },
              actionType: {
                in: ['created', 'updated', 'accepted'],
              },
            },
            orderBy: {
              recordedAt: 'desc',
            },
          });

          if (eventActions.length === 0) {
            console.log(`No event actions for user ${user.id}, skipping`);
            continue;
          }

          // Cluster events by semantics
          const clusters = await clusterEventsBySemantics(eventActions);

          if (clusters.length === 0) {
            console.log(`No clusters generated for user ${user.id}, skipping`);
            continue;
          }

          // Deduplicate similar habits
          const dedupedClusters = deduplicateHabits(clusters);

          // Get existing clusters for this user
          const existingClusters = await prisma.habitCluster.findMany({
            where: { userId: user.id },
          });

          // Update or create clusters
          for (const cluster of dedupedClusters) {
            // Try to find a matching existing cluster
            const existingCluster = existingClusters.find(
              ec => ec.clusterLabel === cluster.clusterLabel
            );

            if (existingCluster) {
              // Update existing cluster
              await prisma.habitCluster.update({
                where: { id: existingCluster.id },
                data: {
                  exemplarTitle: cluster.exemplarTitle,
                  embedding: cluster.embedding,
                  memberEventIds: cluster.memberEventIds,
                },
              });
            } else {
              // Create new cluster
              await prisma.habitCluster.create({
                data: {
                  userId: user.id,
                  clusterLabel: cluster.clusterLabel,
                  exemplarTitle: cluster.exemplarTitle,
                  embedding: cluster.embedding,
                  memberEventIds: cluster.memberEventIds,
                },
              });
            }
          }

          // Update user's last refinement timestamp
          await prisma.user.update({
            where: { id: user.id },
            data: { lastHabitRefinementAt: new Date() },
          });

          totalProcessed++;
          console.log(`Processed user ${user.id}: ${dedupedClusters.length} clusters`);
        } catch (userError) {
          console.error(`Error processing user ${user.id}:`, userError);
          // Continue with next user
        }
      }

      // Update job log with success
      await prisma.backgroundJobLog.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          processedCount: totalProcessed,
        },
      });

      return NextResponse.json({
        success: true,
        processed: totalProcessed,
        message: `Successfully refined habits for ${totalProcessed} users`,
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update job log with failure
      await prisma.backgroundJobLog.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          processedCount: totalProcessed,
          errorMessage,
        },
      });

      throw error;
    }
  } catch (error) {
    console.error('Error in refine-habits cron job:', error);
    return NextResponse.json(
      { error: 'Failed to refine habits', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: Request) {
  // Check for a secret key for manual trigger
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Forward to POST handler
  return POST(request);
}


