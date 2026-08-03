import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bad Blokes Acca",
  description: "Weekly football picks, points & fines tracker for the lads.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060810",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} h-full`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NavBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-[calc(4.75rem+var(--safe-bottom))] sm:pt-6 sm:pb-6">
          {children}
        </main>
        <MobileTabBar />
      </body>
    </html>
  );
}
