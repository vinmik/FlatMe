import "@fontsource-variable/inter";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: "FlatMe — verified flat sharing in Hyderabad", template: "%s | FlatMe" },
  description: "Find a room or a flatmate in Hyderabad among verified working professionals. Every member signs in with a work email.",
  applicationName: "FlatMe",
  openGraph: { type: "website", siteName: "FlatMe", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#0891b2" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="flex min-h-screen flex-col">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[3000] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-pop">
            Skip to content
          </a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
