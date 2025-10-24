import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This contains the user ID
  const error = searchParams.get('error');

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=calendar_permission_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=invalid_callback`);
  }

  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/google-calendar/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Update the user's Google account with the new tokens
    await prisma.account.updateMany({
      where: {
        userId: state,
        provider: 'google',
      },
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
        scope: tokens.scope,
      },
    });

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?success=calendar_permissions_granted`);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/settings?error=token_exchange_failed`);
  }
}
