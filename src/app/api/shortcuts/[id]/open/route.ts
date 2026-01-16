import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function getUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

export async function POST(
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

  let targetExists = false;
  let url = "";

  if (shortcut.targetType === "DOCUMENT") {
    const document = await prisma.document.findFirst({
      where: { id: shortcut.targetId, userId: user.id },
      select: { id: true },
    });

    if (document) {
      targetExists = true;
      url = `/notebook/${document.id}`;
    }
  }

  if (shortcut.targetType === "BULLETIN") {
    const bulletin = await prisma.bulletin.findFirst({
      where: { id: shortcut.targetId, userId: user.id },
      select: { id: true },
    });

    if (bulletin) {
      targetExists = true;
      url = `/bulletin?noteId=${bulletin.id}`;
    }
  }

  if (!targetExists) {
    await prisma.shortcut.delete({
      where: { id: shortcutId },
    });

    return NextResponse.json({ ok: false, reason: "MISSING_TARGET" });
  }

  return NextResponse.json({
    ok: true,
    targetType: shortcut.targetType,
    targetId: shortcut.targetId,
    url,
  });
}
