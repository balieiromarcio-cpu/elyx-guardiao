import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Guardião Élyx",
  description: "Hub único de marca e produtos da Élyx Nutrition — fatos, versões e API que 007, Sidney, portal e agentes leem",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a0a0c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${inter.variable}`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-fg">{children}</body>
    </html>
  );
}
