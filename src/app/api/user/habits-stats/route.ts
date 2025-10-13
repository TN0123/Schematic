import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import authOptions from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const habitProfiles = await prisma.habitProfile.findMany({
      where: { userId: session.user.id },
      orderBy: { confidenceScore: 'desc' },
    });

    const stats = habitProfiles.map(profile => ({
      habitType: profile.habitType,
      count: profile.count,
      confidenceScore: profile.confidenceScore,
      centroid: profile.centroid,
      timeSlotHistogram: profile.timeSlotHistogram,
      lastUpdatedAt: profile.lastUpdatedAt,
    }));

    return NextResponse.json({
      habits: stats,
      totalHabits: stats.length,
      enabled: (await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { habitLearningEnabled: true },
      }))?.habitLearningEnabled ?? true,
    });
  } catch (error) {
    console.error('Error fetching habit stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habit stats' },
      { status: 500 }
    );
  }
}

