import type { NextConfig } from "next";

const isElectron =
  process.env.NODE_ENV === "production" && process.env.ELECTRON === "true";

const nextConfig: NextConfig = {
  // Enable static export for Electron
  output: isElectron ? "export" : undefined,
  trailingSlash: isElectron ? true : undefined,

  // Set environment variable for middleware
  env: {
    NEXT_OUTPUT: isElectron ? "export" : "default",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // Disable image optimization for static export
    unoptimized: isElectron,
  },
  async rewrites() {
    // Skip rewrites for static export
    if (isElectron) return [];

    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
