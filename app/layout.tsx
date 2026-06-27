import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { CSSProperties } from "react";
import { getThemeSettings } from "@/lib/theme/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Planizmo",
  description: "Your AI planner assistant — plan your day and week, your way.",
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
      className={inter.variable}
      style={{ "--accent": accent } as CSSProperties}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
