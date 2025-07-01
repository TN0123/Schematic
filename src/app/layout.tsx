import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
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
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback: check system preference
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }
              })();
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="theme"
        >
          <NextStepProvider>
            <NextStepWrapper>
              <AuthProvider>
                <PostHogProvider>
                  <SearchProvider>
                    <Navigation />
                    <MainWrapper>{children}</MainWrapper>
                    <PageTransition />
                    <GlobalSearch />
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
