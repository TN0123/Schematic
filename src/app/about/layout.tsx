import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Schematic - AI-Powered Productivity Workspace",
  description:
    "Learn about Schematic, an open-source AI-powered productivity workspace designed to help you stay organized, focused, and productive with intelligent task management and personalized AI assistance.",
  keywords: [
    "Schematic",
    "AI productivity",
    "task management",
    "AI workspace",
    "productivity tools",
    "open source",
    "AI writing",
    "smart scheduling",
  ],
  openGraph: {
    title: "About Schematic - AI-Powered Productivity Workspace",
    description:
      "Learn about Schematic, an open-source AI-powered productivity workspace designed to help you stay organized, focused, and productive with intelligent task management and personalized AI assistance.",
    type: "website",
    url: "https://www.schematic.now/about",
    siteName: "Schematic",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Schematic - AI-Powered Productivity Workspace",
    description:
      "Learn about Schematic, an open-source AI-powered productivity workspace designed to help you stay organized, focused, and productive with intelligent task management and personalized AI assistance.",
  },
  alternates: {
    canonical: "/about",
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

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
