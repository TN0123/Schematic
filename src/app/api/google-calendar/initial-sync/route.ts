import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { performInitialSync } from "@/lib/google-calendar-sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { calendarId } = await req.json();

    if (!calendarId) {
      return NextResponse.json(
        { error: "Calendar ID is required" },
        { status: 400 }
      );
    }

    const result = await performInitialSync(session.user.id, calendarId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error performing initial sync:", error);
    return NextResponse.json(
      { error: "Failed to perform initial sync" },
      { status: 500 }
    );
  }
}

