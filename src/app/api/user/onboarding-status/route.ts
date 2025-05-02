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
      hasCompletedScheduleTour: true,
      hasCompletedWriteTour: true,
    },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  return Response.json(user);
}
