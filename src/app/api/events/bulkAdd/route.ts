import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { normalizeUrls } from "@/lib/url";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { events } = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "No events provided" },
        { status: 400 }
      );
    }

    const createdEvents = await prisma.$transaction(
      events.map((event) =>
        // Normalize each event's links
        {
          const normalizedLinks = normalizeUrls(event.links);
          return prisma.event.create({
            data: {
              title: event.title,
              start: new Date(event.start),
              end: new Date(event.end),
              links: Array.isArray(normalizedLinks) ? normalizedLinks : undefined,
              userId: session.user.id!,
            },
          });
        }
      )
    );

    return NextResponse.json(createdEvents, { status: 201 });
  } catch (error) {
    console.error("Error creating multiple events:", error);
    return NextResponse.json(
      { error: "Error creating events" },
      { status: 500 }
    );
  }
}
