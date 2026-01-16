import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { getUtcDayBoundsForTimezone } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timezone = searchParams.get("timezone") || "UTC";

  try {
    const now = new Date();
    const { startUtc, endUtc } = getUtcDayBoundsForTimezone(now, timezone);

    // Next upcoming event that starts today (in the user's timezone)
    const event = await prisma.event.findFirst({
      where: {
        userId: session.user.id,
        AND: [
          { start: { gte: now } },
          { start: { gte: startUtc } },
          { start: { lt: endUtc } },
        ],
      },
      orderBy: {
        start: "asc",
      },
      select: {
        id: true,
        title: true,
        start: true,
        end: true,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error fetching next today's event:", error);
    return NextResponse.json(
      { error: "Error fetching next today's event" },
      { status: 500 }
    );
  }
}
