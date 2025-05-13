import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;

    if (id === "bulk") {
      const body = await req.json();
      const { ids } = body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: "No event IDs provided" },
          { status: 400 }
        );
      }

      const deletedEvents = await prisma.event.deleteMany({
        where: {
          userId: session.user.id,
          id: { in: ids },
        },
      });
      return NextResponse.json(deletedEvents, { status: 200 });
    } else {
      const event = await prisma.event.delete({
        where: { id: id, userId: session.user.id },
      });
      return NextResponse.json(event, { status: 200 });
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Error deleting event" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = (await params).id;
    const { title, start, end } = await req.json();

    const updatedEvent = await prisma.event.updateMany({
      where: { id: id, userId: session.user.id },
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
      },
    });

    if (updatedEvent.count === 0) {
      return NextResponse.json(
        { error: "Event not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Event updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Error updating event" },
      { status: 500 }
    );
  }
}
