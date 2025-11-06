import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { performManualSync } from "@/lib/google-calendar-sync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log('[GCAL Manual Sync] Triggered', {
      userId: session.user.id,
      env: {
        VERCEL_URL: process.env.VERCEL_URL || null,
        NODE_ENV: process.env.NODE_ENV,
      },
    });
    const result = await performManualSync(session.user.id);
    console.log('[GCAL Manual Sync] Completed', {
      userId: session.user.id,
      pushedToGoogle: result.pushedToGoogle,
      pulledFromGoogle: result.pulledFromGoogle,
      errors: result.errors,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error performing manual sync:", error);
    return NextResponse.json(
      { error: "Failed to perform manual sync" },
      { status: 500 }
    );
  }
}

