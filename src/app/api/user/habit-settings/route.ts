import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import authOptions from '@/lib/auth';

// GET: Return habitLearningEnabled status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        habitLearningEnabled: true,
        lastHabitRefinementAt: true,
        _count: {
          select: {
            habitProfiles: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      habitLearningEnabled: user.habitLearningEnabled,
      lastHabitRefinementAt: user.lastHabitRefinementAt,
      habitCount: user._count.habitProfiles,
    });
  } catch (error) {
    console.error('Error getting habit settings:', error);
    return NextResponse.json(
      { error: 'Failed to get habit settings' },
      { status: 500 }
    );
  }
}

// PUT: Toggle habitLearningEnabled
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitLearningEnabled } = await request.json();

    if (typeof habitLearningEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'habitLearningEnabled must be a boolean' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { habitLearningEnabled },
      select: {
        habitLearningEnabled: true,
        lastHabitRefinementAt: true,
      },
    });

    return NextResponse.json({
      habitLearningEnabled: user.habitLearningEnabled,
      lastHabitRefinementAt: user.lastHabitRefinementAt,
    });
  } catch (error) {
    console.error('Error updating habit settings:', error);
    return NextResponse.json(
      { error: 'Failed to update habit settings' },
      { status: 500 }
    );
  }
}

// DELETE: Clear all user habit data
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all habit-related data for the user
    await prisma.$transaction([
      prisma.eventAction.deleteMany({
        where: { userId: session.user.id },
      }),
      prisma.habitProfile.deleteMany({
        where: { userId: session.user.id },
      }),
      prisma.habitCluster.deleteMany({
        where: { userId: session.user.id },
      }),
    ]);

    // Also reset the last refinement timestamp
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastHabitRefinementAt: null },
    });

    return NextResponse.json({
      success: true,
      message: 'All habit data has been cleared',
    });
  } catch (error) {
    console.error('Error deleting habit data:', error);
    return NextResponse.json(
      { error: 'Failed to delete habit data' },
      { status: 500 }
    );
  }
}


