import type { Metadata } from "next";
import { IBM_Plex_Serif } from "next/font/google";
import "./globals.css";

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-ibm-plex-serif",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IntegrityIndex.ca | The National Standard for Parliamentary Accountability",
  description:
    "Digitizing the connection between financial disclosures and legislative outcomes in Canada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ibmPlexSerif.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
