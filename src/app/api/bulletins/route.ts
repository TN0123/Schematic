import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { canCreateBulletin } from "@/lib/subscription";
import { invalidateAllUserCaches } from "@/lib/cache-utils";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const bulletins = await prisma.bulletin.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(bulletins);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Check if user can create a new bulletin
  const canCreate = await canCreateBulletin(user.id);
  
  if (!canCreate.allowed) {
    return NextResponse.json(
      {
        error: "Bulletin limit reached",
        message: canCreate.reason,
        currentCount: canCreate.currentCount,
        limit: canCreate.limit,
      },
      { status: 403 }
    );
  }

  const {
    title,
    content,
    type = "text",
    data = null,
    schema = null,
  } = await request.json();

  const bulletin = await prisma.bulletin.create({
    data: {
      title,
      content,
      type,
      data,
      schema,
      userId: user.id,
    },
  });

  // Invalidate cache asynchronously (don't await to avoid blocking)
  invalidateAllUserCaches(user.id).catch(err => 
    console.error('Failed to invalidate cache:', err)
  );

  return NextResponse.json(bulletin);
}
