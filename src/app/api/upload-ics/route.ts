import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ical from "node-ical";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    // Restrict to .ics content and limit size to 1MB
    const allowedMimeTypes = new Set([
      "text/calendar",
      "application/octet-stream", // some browsers may send this for .ics
    ]);
    const maxBytes = 1 * 1024 * 1024;

    if (typeof file.size === "number" && file.size > maxBytes) {
      return NextResponse.json(
        { message: "File too large. Max 1MB" },
        { status: 413 }
      );
    }

    if (file.type && !allowedMimeTypes.has(file.type)) {
      return NextResponse.json(
        { message: "Unsupported file type" },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const icsString = buffer.toString("utf-8");
    const data = ical.parseICS(icsString);

    const events: Array<{ id: string; title: string; start: Date; end: Date }> = [];

    for (const k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        const event: any = (data as any)[k];
        if (event && event.type === "VEVENT") {
          events.push({
            id: String(event.uid ?? k),
            title: String(event.summary ?? "Untitled Event"),
            start: new Date(event.start),
            end: new Date(event.end),
          });
        }
      }
    }

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error parsing ICS file:", error);
    return NextResponse.json(
      { message: "Error parsing ICS file." },
      { status: 500 }
    );
  }
}
