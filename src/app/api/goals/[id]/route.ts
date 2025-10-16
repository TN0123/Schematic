import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { invalidateAllUserCaches } from '@/lib/cache-utils';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new NextResponse('User not found', { status: 404 });
  }

  const id = (await params).id;
  await prisma.goal.delete({
    where: { id: id },
  });

  // Invalidate cache asynchronously (don't await to avoid blocking)
  invalidateAllUserCaches(user.id).catch(err => 
    console.error('Failed to invalidate cache:', err)
  );

  return new NextResponse(null, { status: 204 });
}