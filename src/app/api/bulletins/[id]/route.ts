import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const updates = await request.json();
  const { id } = await params;
  const bulletin = await prisma.bulletin.update({
    where: { id: id },
    data: updates,
  });

  return NextResponse.json(bulletin);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { id } = await params;
  await prisma.bulletin.delete({
    where: { id: id },
  });

  return new NextResponse(null, { status: 204 });
}