import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
import MobileTabBar from "@/components/MobileTabBar";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { NextStepProvider } from "nextstepjs";
import NextStepWrapper from "@/components/NextStepWrapper";
import Script from "next/script";
import PageTransition from "@/components/PageTransition";
import MainWrapper from "@/components/MainWrapper";
import PostHogProvider from "@/components/PostHogProvider";
import GlobalSearch from "@/components/GlobalSearch";
import { SearchProvider } from "@/components/SearchProvider";
import { WriteSettingsProvider } from "@/components/WriteSettingsProvider";
import { ScheduleSettingsProvider } from "@/components/ScheduleSettingsProvider";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChangelogModal from "./(components)/ChangelogModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://www.schematic.now";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Schematic",
    template: "%s · Schematic",
  },
  description:
    "Schematic is an AI powered productivity workspace for notes, scheduling, and everyday writing.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Schematic",
    title: "Schematic",
    description:
      "Schematic is an AI powered productivity workspace for notes, scheduling, and everyday writing.",
  },
  twitter: {
    card: "summary",
    title: "Schematic",
    description:
      "Schematic is an AI powered productivity workspace for notes, scheduling, and everyday writing.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  let updatesForUser: {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
  }[] = [];
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastSeenUpdatesAt: true },
    });
    const baseline = user?.lastSeenUpdatesAt || null;

    const updates = await prisma.productUpdate.findMany({
      where: baseline
        ? { isPublished: true, publishedAt: { gt: baseline } }
        : { isPublished: true },
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, description: true, publishedAt: true },
    });
    updatesForUser = updates.map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      publishedAt: u.publishedAt.toISOString(),
    }));
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme detection script - must be blocking to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  
                  // Determine the actual theme to use
                  var actualTheme = theme === 'system' || !theme ? systemTheme : theme;
                  
                  // Apply the theme immediately
                  if (actualTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                  
                  // Prevent any flickering by setting initial styles
                  document.documentElement.style.visibility = 'visible';
                } catch (e) {
                  // Fallback: check system preference
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.style.colorScheme = 'light';
                  }
                  document.documentElement.style.visibility = 'visible';
                }
              })();
            `,
          }}
        />
        {/* Additional CSS to prevent flash */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html { visibility: hidden; }
              html.dark { background-color: #121212; color: #ffffff; }
            `,
          }}
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VZSDFYLZ9M"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-VZSDFYLZ9M');
          `}
        </Script>
        <Script
          id="ld-software"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Schematic",
            applicationCategory: "ProductivityApplication",
            operatingSystem: "Web",
            url: siteUrl,
          })}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={true}
          storageKey="theme"
        >
          <NextStepProvider>
            <NextStepWrapper>
              <AuthProvider>
                <PostHogProvider>
                  <SearchProvider>
                    <WriteSettingsProvider>
                      <ScheduleSettingsProvider>
                        <Navigation />
                        <MobileTabBar />
                        <MainWrapper>
                          {children}
                          {updatesForUser.length > 0 && (
                            <ChangelogModal updates={updatesForUser} />
                          )}
                        </MainWrapper>
                        <PageTransition />
                        <GlobalSearch />
                      </ScheduleSettingsProvider>
                    </WriteSettingsProvider>
                  </SearchProvider>
                </PostHogProvider>
              </AuthProvider>
            </NextStepWrapper>
          </NextStepProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
