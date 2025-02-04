import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const event = await prisma.event.delete({
        where: {
          id: String(id),
          userId: session.user.id,
        },
      });
      return res.status(200).json(event);
    } catch (error) {
      console.error("Error deleting event:", error);
      return res.status(500).json({ error: "Error deleting event" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}