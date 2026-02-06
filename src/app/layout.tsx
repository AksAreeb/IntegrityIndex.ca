import type { Metadata, Viewport } from "next";
import { IBM_Plex_Serif, Inter } from "next/font/google";
import { JurisdictionProvider } from "@/contexts/JurisdictionContext";
import { logger } from "@/lib/logger";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-ibm-plex-serif",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://integrityindex.ca"),
  title: {
    default: "Integrity Index",
    template: "%s | Integrity Index",
  },
  description:
    "The definitive dashboard for Canadian MP and MPP financial disclosures and stock trades.",
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

logger.info("App initialized");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSerif.variable} ${inter.variable}`}>
      <body className="antialiased font-sans bg-[#FFFFFF] text-[#0F172A]">
        <JurisdictionProvider>{children}</JurisdictionProvider>
        <Analytics debug={true} />
      </body>
    </html>
  );
}
