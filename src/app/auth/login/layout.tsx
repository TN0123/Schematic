import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schematic - AI-Powered Productivity Workspace",
  description:
    "Schematic is an AI powered productivity workspace for notes, scheduling, and everyday writing. Get organized, stay focused, and boost your productivity with intelligent task management.",
  keywords: [
    "Schematic",
    "AI productivity",
    "task management",
    "AI workspace",
    "productivity tools",
    "AI writing",
    "smart scheduling",
    "notes app",
  ],
  openGraph: {
    title: "Schematic - AI-Powered Productivity Workspace",
    description:
      "Schematic is an AI powered productivity workspace for notes, scheduling, and everyday writing. Get organized, stay focused, and boost your productivity with intelligent task management.",
    type: "website",
    url: "https://www.schematic.now/auth/login",
    siteName: "Schematic",
  },
  twitter: {
    card: "summary_large_image",
    title: "Schematic - AI-Powered Productivity Workspace",
    description:
      "Schematic is an AI powered productivity workspace for notes, scheduling, and everyday writing. Get organized, stay focused, and boost your productivity with intelligent task management.",
  },
  alternates: {
    canonical: "/auth/login",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
