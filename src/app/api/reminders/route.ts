import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Fetch all reminders for the authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminders = await prisma.reminder.findMany({
      where: {
        userId: session.user.id,
        isRead: false, // Only fetch unread reminders
      },
      orderBy: {
        time: "asc",
      },
    });

    return NextResponse.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

// POST - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, time, isAISuggested = false } = await request.json();

    if (!text || !time) {
      return NextResponse.json(
        { error: "Text and time are required" },
        { status: 400 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        text,
        time: new Date(time),
        isAISuggested,
        userId: session.user.id,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}

// DELETE - Mark a reminder as read (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get("id");

    if (!reminderId) {
      return NextResponse.json(
        { error: "Reminder ID is required" },
        { status: 400 }
      );
    }

    // Mark the reminder as read instead of deleting it
    const reminder = await prisma.reminder.update({
      where: {
        id: reminderId,
        userId: session.user.id, // Ensure user can only dismiss their own reminders
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json(reminder);
  } catch (error) {
    console.error("Error dismissing reminder:", error);
    return NextResponse.json(
      { error: "Failed to dismiss reminder" },
      { status: 500 }
    );
  }
}
