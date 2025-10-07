import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canCreateDocument } from "@/lib/subscription";

// Get all documents for the current user
export async function GET() {
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

  const documents = await prisma.document.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json(documents);
}

// Create a new document
export async function POST(request: Request) {
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

  // Check if user can create a new document
  const canCreate = await canCreateDocument(user.id);
  
  if (!canCreate.allowed) {
    return NextResponse.json(
      {
        error: "Document limit reached",
        message: canCreate.reason,
        currentCount: canCreate.currentCount,
        limit: canCreate.limit,
      },
      { status: 403 }
    );
  }

  const { title, content } = await request.json();

  const document = await prisma.document.create({
    data: {
      title: title || "Untitled Document",
      content: content || "",
      userId: user.id,
    },
  });

  return NextResponse.json(document);
}

// Update a document
export async function PUT(request: Request) {
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

  const { id, title, content } = await request.json();

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return new NextResponse("Document not found", { status: 404 });
  }

  if (document.userId !== user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: {
      title,
      content,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(updatedDocument);
}

// Delete a document
export async function DELETE(request: Request) {
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

  const { id } = await request.json();

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return new NextResponse("Document not found", { status: 404 });
  }

  if (document.userId !== user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await prisma.document.delete({
    where: { id },
  });

  return new NextResponse(null, { status: 204 });
} 