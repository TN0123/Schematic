import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { scheduleContext: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ context: user.scheduleContext });
  } catch (error) {
    console.error("Error fetching schedule context:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule context" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, context } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { scheduleContext: context || "" },
    });

    return NextResponse.json({
      success: true,
      context: updatedUser.scheduleContext,
    });
  } catch (error) {
    console.error("Error updating schedule context:", error);
    return NextResponse.json(
      { error: "Failed to update schedule context" },
      { status: 500 }
    );
  }
}
