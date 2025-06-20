import { NextRequest, NextResponse } from "next/server";
import ical from "node-ical";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const icsString = buffer.toString("utf-8");
    const data = ical.parseICS(icsString);

    const events = [];

    for (const k in data) {
      if (data.hasOwnProperty(k)) {
        const event = data[k];
        if (event.type === "VEVENT") {
          events.push({
            id: event.uid,
            title: event.summary,
            start: event.start,
            end: event.end,
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
