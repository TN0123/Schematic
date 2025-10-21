import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { assistantName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ assistantName: user.assistantName });
  } catch (error) {
    console.error("Error fetching assistant name:", error);
    return NextResponse.json(
      { error: "Failed to fetch assistant name" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assistantName } = await request.json();

    if (!assistantName || typeof assistantName !== "string") {
      return NextResponse.json(
        { error: "Assistant name is required" },
        { status: 400 }
      );
    }

    if (assistantName.trim().length === 0) {
      return NextResponse.json(
        { error: "Assistant name cannot be empty" },
        { status: 400 }
      );
    }

    if (assistantName.length > 50) {
      return NextResponse.json(
        { error: "Assistant name must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Sanitize the assistant name to prevent prompt injection
    const sanitizedName = assistantName
      .trim()
      // Remove or escape characters that could break the prompt
      .replace(/["'`\\]/g, '') // Remove quotes and backslashes
      .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .substring(0, 50); // Ensure max length after sanitization

    if (sanitizedName.length === 0) {
      return NextResponse.json(
        { error: "Assistant name contains only invalid characters" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { assistantName: sanitizedName },
      select: { assistantName: true },
    });

    return NextResponse.json({ assistantName: updatedUser.assistantName });
  } catch (error) {
    console.error("Error updating assistant name:", error);
    return NextResponse.json(
      { error: "Failed to update assistant name" },
      { status: 500 }
    );
  }
}


