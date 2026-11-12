import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "BunkSmart", description: "Know exactly when you can skip, and when you can't." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f5bea" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>{children}</body>
    </html>
  );
}
