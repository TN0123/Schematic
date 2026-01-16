import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

function clamp(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

async function getUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const shortcutId = (await params).id;
  const shortcut = await prisma.shortcut.findUnique({
    where: { id: shortcutId },
  });

  if (!shortcut || shortcut.userId !== user.id) {
    return new NextResponse("Shortcut not found", { status: 404 });
  }

  const payload = await request.json();
  const x = payload?.x;
  const y = payload?.y;

  if (typeof x !== "number" || typeof y !== "number") {
    return new NextResponse("Invalid coordinates", { status: 400 });
  }

  const updatedShortcut = await prisma.shortcut.update({
    where: { id: shortcutId },
    data: {
      x: clamp(x),
      y: clamp(y),
    },
  });

  return NextResponse.json(updatedShortcut);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const shortcutId = (await params).id;
  const shortcut = await prisma.shortcut.findUnique({
    where: { id: shortcutId },
  });

  if (!shortcut || shortcut.userId !== user.id) {
    return new NextResponse("Shortcut not found", { status: 404 });
  }

  await prisma.shortcut.delete({
    where: { id: shortcutId },
  });

  return new NextResponse(null, { status: 204 });
}
