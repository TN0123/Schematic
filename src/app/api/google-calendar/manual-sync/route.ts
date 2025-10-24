import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { performIncrementalSync } from "@/lib/google-calendar-sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await performIncrementalSync(session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error performing manual sync:", error);
    return NextResponse.json(
      { error: "Failed to perform manual sync" },
      { status: 500 }
    );
  }
}

