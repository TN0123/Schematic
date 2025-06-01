import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "../../../../lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }
  const documentId = (await params).documentId;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });
  if (!document || document.userId !== user.id) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.json(document);
} 