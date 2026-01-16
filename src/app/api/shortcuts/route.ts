import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const allowedTargetTypes = new Set(["DOCUMENT", "BULLETIN"]);

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

export async function GET() {
  const user = await getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const shortcuts = await prisma.shortcut.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const documentIds = shortcuts
    .filter((shortcut) => shortcut.targetType === "DOCUMENT")
    .map((shortcut) => shortcut.targetId);
  const bulletinIds = shortcuts
    .filter((shortcut) => shortcut.targetType === "BULLETIN")
    .map((shortcut) => shortcut.targetId);

  const [documents, bulletins] = await Promise.all([
    documentIds.length
      ? prisma.document.findMany({
          where: { id: { in: documentIds }, userId: user.id },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    bulletinIds.length
      ? prisma.bulletin.findMany({
          where: { id: { in: bulletinIds }, userId: user.id },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  const documentTitles = new Map(
    documents.map((document) => [document.id, document.title ?? ""])
  );
  const bulletinTitles = new Map(
    bulletins.map((bulletin) => [bulletin.id, bulletin.title ?? ""])
  );

  const payload = shortcuts.map((shortcut) => ({
    ...shortcut,
    title:
      shortcut.targetType === "DOCUMENT"
        ? documentTitles.get(shortcut.targetId) ?? null
        : bulletinTitles.get(shortcut.targetId) ?? null,
  }));

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const user = await getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const payload = await request.json();
  const targetType = payload?.targetType;
  const targetId = payload?.targetId;
  const x = payload?.x;
  const y = payload?.y;

  if (!allowedTargetTypes.has(targetType) || typeof targetId !== "string") {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  if (typeof x !== "number" || typeof y !== "number") {
    return new NextResponse("Invalid coordinates", { status: 400 });
  }

  let title: string | null = null;

  if (targetType === "DOCUMENT") {
    const document = await prisma.document.findFirst({
      where: { id: targetId, userId: user.id },
      select: { id: true, title: true },
    });

    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    title = document.title ?? null;
  }

  if (targetType === "BULLETIN") {
    const bulletin = await prisma.bulletin.findFirst({
      where: { id: targetId, userId: user.id },
      select: { id: true, title: true },
    });

    if (!bulletin) {
      return new NextResponse("Note not found", { status: 404 });
    }

    title = bulletin.title ?? null;
  }

  const shortcut = await prisma.shortcut.create({
    data: {
      userId: user.id,
      targetType,
      targetId,
      x: clamp(x),
      y: clamp(y),
    },
  });

  return NextResponse.json({ ...shortcut, title });
}
