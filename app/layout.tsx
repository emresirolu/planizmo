import type { Metadata, Viewport } from "next";
import { Inter, Newsreader, JetBrains_Mono, Caveat } from "next/font/google";
import type { CSSProperties } from "react";
import { getThemeSettings } from "@/lib/theme/server";
import Pwa from "@/components/Pwa";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Editorial daybook type system (cream/sage identity).
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planizmo",
  description: "Your AI planner assistant — plan your day and week, your way.",
  appleWebApp: { capable: true, title: "Planizmo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4F6BED",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, accent } = await getThemeSettings();

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} ${caveat.variable}`}
      style={{ "--accent": accent } as CSSProperties}
      suppressHydrationWarning
    >
      <body>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
