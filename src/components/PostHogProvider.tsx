"use client";

import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { useEffect } from "react";
import { PostHogPageviewTracker } from "./PostHogPageviewTracker";

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    capture_pageview: false, // Pageviews captured manually
    capture_pageleave: true,
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    } else if (status === "unauthenticated") {
      posthog.reset();
    }
  }, [status, session]);

  return (
    <>
      <PostHogPageviewTracker />
      {children}
    </>
  );
}
