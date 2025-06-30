import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ documents: [], bulletins: [] });
  }

  const searchQuery = query.trim().toLowerCase();

  try {
    // Search documents
    const documents = await prisma.document.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10, // Limit results
    });

    // Search bulletins
    const bulletins = await prisma.bulletin.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 10, // Limit results
    });

    return NextResponse.json({
      documents,
      bulletins,
    });
  } catch (error) {
    console.error("Search error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
