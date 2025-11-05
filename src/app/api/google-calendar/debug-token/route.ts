import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's account from the database
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    });

    if (!account) {
      return NextResponse.json({
        hasRefreshToken: false,
        hasCalendarScope: false,
        tokenExpiry: null,
        scopes: [],
      });
    }

    // Check if refresh token exists
    const hasRefreshToken = !!account.refresh_token;

    // Parse the scope string to check for calendar permissions
    const scopes = account.scope ? account.scope.split(" ") : [];
    const hasCalendarScope = scopes.some(scope => 
      scope.includes("calendar") || scope.includes("https://www.googleapis.com/auth/calendar")
    );

    // Get token expiry if available
    const tokenExpiry = account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null;

    return NextResponse.json({
      hasRefreshToken,
      hasCalendarScope,
      tokenExpiry,
      scopes,
    });

  } catch (error) {
    console.error("Error fetching debug token info:", error);
    return NextResponse.json(
      { error: "Failed to fetch debug token information" },
      { status: 500 }
    );
  }
}
