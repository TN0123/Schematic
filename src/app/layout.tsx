import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="bg-white shadow-sm border-b border-gray-100">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <a href="/" className="text-xl font-bold text-black">
                Schematic
              </a>
              <ul className="flex items-center gap-8">
                <li>
                  <a
                    href="/write"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Write
                  </a>
                </li>
                <li>
                  <a
                    href="/schedule"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Schedule
                  </a>
                </li>
                <li>
                  <a
                    href="/bulletin"
                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
                  >
                    Bulletin
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
