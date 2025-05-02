import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { NextStepProvider } from "nextstepjs";
import NextStepWrapper from "@/components/NextStepWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Schematic",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const handleTourComplete = async (tourName: string | null) => {
    if (!tourName) return;

    const tourKeyMap: Record<string, string> = {
      scheduleTour: "schedule",
      bulletinTour: "bulletin",
      writeTour: "write",
    };

    const tourKey = tourKeyMap[tourName];
    if (!tourKey) return;

    try {
      await fetch("/api/user/complete-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourKey }),
      });
    } catch (error) {
      console.error(`Failed to mark ${tourKey} tour as complete:`, error);
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextStepProvider>
            <NextStepWrapper>
              <AuthProvider>
                <Navigation />
                {children}
              </AuthProvider>
            </NextStepWrapper>
          </NextStepProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
