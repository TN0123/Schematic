import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/login",
    },
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|sitemap.xml.gz|auth/login|about|privacy|write-image.png|bulletin-image.png|schedule-image.png|default-avatar.png|file.svg|globe.svg|next.svg|vercel.svg|window.svg|api/stripe|api/google-calendar).*)",
  ],
};
