import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth";
import { normalizeUrls } from "@/lib/url";


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  try {
    // Query for events that overlap with the requested range
    // An event overlaps if: event.start < range.end AND event.end > range.start
    const events = await prisma.event.findMany({
      where: {
        userId: session.user.id,
        AND: [
          {
            start: {
              lt: end ? new Date(end) : undefined,
            },
          },
          {
            end: {
              gt: start ? new Date(start) : undefined,
            },
          },
        ],
      },
      orderBy: {
        start: 'asc',
      },
    });
    
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Error fetching events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, start, end, links } = await req.json();
    const normalizedLinks = normalizeUrls(links);
    const event = await prisma.event.create({
      data: { title, start: new Date(start), end: new Date(end), userId: session.user.id, links: Array.isArray(normalizedLinks) ? normalizedLinks : undefined },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Error creating event" }, { status: 500 });
  }
}
