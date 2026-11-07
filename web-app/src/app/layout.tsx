import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Blooming World — Цветущий мир | Match-3",
  description:
    "Три-в-ряд с эволюцией графики: от каменного века до золотого сада. 100 уровней, бусты, скины, глобальный рейтинг.",
  keywords: ["match-3", "три в ряд", "пазл", "игра", "casual", "puzzle"],
};

export const viewport: Viewport = {
  themeColor: "#1a4a38",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${nunito.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
