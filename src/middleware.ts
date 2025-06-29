import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Middleware only works in server-side environments, not in static exports
// This check ensures it only runs when not in a static build
const isStaticExport =
  process.env.NODE_ENV === "production" && process.env.NEXT_OUTPUT === "export";

export default isStaticExport
  ? function middleware() {
      return NextResponse.next();
    }
  : withAuth(
      // Augment the basic withAuth function
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
    "/((?!api/auth|_next/static|_next/image|favicon.ico|auth/login).*)",
  ],
};
