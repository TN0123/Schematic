import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { goalText: true },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  return NextResponse.json({ goalText: user.goalText });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { goalText } = await request.json();

  if (typeof goalText !== "string") {
    return new NextResponse("Goal text must be a string", { status: 400 });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { goalText },
    });

    return NextResponse.json({
      success: true,
      goalText: updatedUser.goalText,
    });
  } catch (error) {
    console.error("Error updating goal text:", error);
    return new NextResponse("Failed to update goal text", { status: 500 });
  }
}
