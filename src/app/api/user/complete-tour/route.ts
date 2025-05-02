import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { tourKey } = await req.json();

  const fieldMap: Record<string, keyof typeof prisma.user.fields> = {
    schedule: "hasCompletedScheduleTour",
    write: "hasCompletedWriteTour",
  };

  const field = fieldMap[tourKey];

  if (!field) {
    return new Response("Invalid tour key", { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      [field]: true,
    },
  });

  return new Response("Tour marked complete", { status: 200 });
}
