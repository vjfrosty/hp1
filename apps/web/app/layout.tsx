import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Playfair_Display } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";

import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { Providers } from "./providers";

// Self-hosted by next/font at build time: no runtime request to Google Fonts.
const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "АЙДЕ ПО ЕДНА! — Мъжки сбирки и компания",
  description:
    "Социална платформа за организиране на мъжки сбирки, мезе и приятелска компания в България.",
  applicationName: "Айде по една",
  appleWebApp: { capable: true, title: "Айде по една", statusBarStyle: "default" },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C4532",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={`${playfair.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        {/* cacheOnNavigation off: pages may hold private data (AGENTS.md rule 11). */}
        <SerwistProvider swUrl="/serwist/sw.js" cacheOnNavigation={false} disable={process.env.NODE_ENV === "development"}>
          <AuthProvider>
            <Providers>
              {children}
              <OfflineIndicator />
            </Providers>
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
