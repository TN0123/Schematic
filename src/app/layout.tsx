import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { NextStepProvider, NextStep } from "nextstepjs";
import { steps } from "@/lib/nextstep-steps";
import CustomCard from "@/components/OnboardingCard";

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextStepProvider>
            <NextStep steps={steps} cardComponent={CustomCard}>
              <AuthProvider>
                <Navigation />
                {children}
              </AuthProvider>
            </NextStep>
          </NextStepProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
