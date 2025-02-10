import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const events = await prisma.event.findMany({
        where: {
          userId: session.user.id,
        },
      });
      return res.status(200).json({ events });
    } catch (error) {
      console.error("Error fetching events:", error);
      return res.status(500).json({ error: "Error fetching events" });
    }
  }

  if (req.method === "POST") {
    try {
      const { title, start, end } = req.body;
      const event = await prisma.event.create({
        data: {
          title,
          start: new Date(start),
          end: new Date(end),
          userId: session.user.id,
        },
      });
      return res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Error creating event" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}