import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { latestPublishedAt } = await request.json().catch(() => ({ latestPublishedAt: null }));
    const now = new Date();
    const timestamp = latestPublishedAt ? new Date(latestPublishedAt) : now;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenUpdatesAt: timestamp },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark updates as seen", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


