import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
  });

  const orderedGoals = goals.sort((a, b) => {
    const order = { daily: 1, weekly: 2, monthly: 3, yearly: 4 };
    return (
      order[a.type.toLowerCase() as keyof typeof order] -
      order[b.type.toLowerCase() as keyof typeof order]
    );
  });

  return NextResponse.json(orderedGoals);
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

  const { title, type } = await request.json();

  const goal = await prisma.goal.create({
    data: {
      title,
      type,
      userId: user.id,
    },
  });

  // Invalidate cache asynchronously (don't await to avoid blocking)
  invalidateAllUserCaches(user.id).catch(err => 
    console.error('Failed to invalidate cache:', err)
  );

  return NextResponse.json(goal);
}
