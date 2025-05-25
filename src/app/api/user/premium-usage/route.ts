import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      premiumRemainingUses: true,
    },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  return Response.json({ remainingUses: user.premiumRemainingUses });
}

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      premiumRemainingUses: true,
    },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  if (user.premiumRemainingUses <= 0) {
    return new Response("No remaining premium model uses", { status: 403 });
  }

  const updatedUser = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      premiumRemainingUses: {
        decrement: 1,
      },
    },
    select: {
      premiumRemainingUses: true,
    },
  });

  return Response.json({ remainingUses: updatedUser.premiumRemainingUses });
} 