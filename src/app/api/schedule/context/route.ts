import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import {
  getMemoryContext,
  formatMemoryForPrompt,
  saveToMemory,
  updateUserProfileField,
  getLongtermMemory,
  getUserProfile,
  getDailyMemory,
  UserProfile,
} from "@/lib/memory";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const timezone = searchParams.get("timezone") || "UTC";
    const format = searchParams.get("format"); // "raw" or "formatted"

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Ensure the user is only accessing their own memory context
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the full memory context
    const memoryContext = await getMemoryContext(userId, timezone);

    if (format === "formatted") {
      // Return a single formatted string (for backward compatibility)
      const formattedContext = formatMemoryForPrompt(memoryContext);
      return NextResponse.json({ context: formattedContext });
    }

    // Return the structured memory context
    return NextResponse.json({
      memory: {
        daily: memoryContext.daily,
        yesterdayDaily: memoryContext.yesterdayDaily,
        longterm: memoryContext.longterm,
        profile: memoryContext.profile,
      },
    });
  } catch (error) {
    console.error("Error fetching memory context:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory context" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, timezone, action, ...data } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    // Ensure the user is only updating their own memory
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userTimezone = timezone || "UTC";

    switch (action) {
      case "save_to_memory": {
        // Save to daily or longterm memory
        const { content, memoryType } = data;
        if (!content || !memoryType) {
          return NextResponse.json(
            { error: "content and memoryType are required" },
            { status: 400 },
          );
        }
        if (memoryType !== "daily" && memoryType !== "longterm") {
          return NextResponse.json(
            { error: "memoryType must be 'daily' or 'longterm'" },
            { status: 400 },
          );
        }

        await saveToMemory(userId, content, memoryType, userTimezone);
        return NextResponse.json({
          success: true,
          message: `Saved to ${memoryType} memory`,
        });
      }

      case "update_profile": {
        // Update a specific profile field
        const { category, field, value } = data;
        if (!category || !field || value === undefined) {
          return NextResponse.json(
            { error: "category, field, and value are required" },
            { status: 400 },
          );
        }

        const validCategories: (keyof UserProfile)[] = [
          "preferences",
          "routines",
          "constraints",
          "workPatterns",
        ];
        if (!validCategories.includes(category)) {
          return NextResponse.json(
            {
              error: `category must be one of: ${validCategories.join(", ")}`,
            },
            { status: 400 },
          );
        }

        await updateUserProfileField(
          userId,
          category as keyof UserProfile,
          field,
          value,
        );
        return NextResponse.json({
          success: true,
          message: `Updated profile: ${category}.${field}`,
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use 'save_to_memory' or 'update_profile'",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error updating memory:", error);
    return NextResponse.json(
      { error: "Failed to update memory" },
      { status: 500 },
    );
  }
}
