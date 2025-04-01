import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const id = (await params).id;
  await prisma.goal.delete({
    where: { id: id },
  });

  return new NextResponse(null, { status: 204 });
}