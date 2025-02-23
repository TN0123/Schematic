import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  // Augment the basic withAuth function
  function middleware(req) {
    // If authenticated user tries to access homepage, redirect to /bulletin
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/bulletin", req.url))
    }
    return NextResponse.next()
  },
  {
    pages: {
      signIn: "/auth/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to homepage without auth
        if (req.nextUrl.pathname === "/") {
          return true
        }
        // Require auth for all other routes
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}