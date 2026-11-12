import type { Metadata, Viewport } from "next";
import { Newsreader, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"], weight: ["500", "600", "700"] });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "ClassPilot",
  description: "Your timetable, attendance, deadlines and events from the MITE ERP in one place.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f5ee" }, { media: "(prefers-color-scheme: dark)", color: "#121110" }],
};

// Set the theme before first paint: saved choice, else the system setting.
const themeScript = `try{var t=localStorage.getItem("cp-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${newsreader.variable} ${spaceMono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
