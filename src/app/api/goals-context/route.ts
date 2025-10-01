import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { goalText: true },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  // Get goals (for list view)
  const goals = await prisma.goal.findMany({
    where: { userId },
    select: { title: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  // Get todo bulletins (for todo view)
  const todoBulletins = await prisma.bulletin.findMany({
    where: {
      userId,
      type: "todo",
    },
    select: {
      id: true,
      title: true,
      data: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    goalText: user.goalText || "",
    goals,
    todoBulletins,
  });
}

