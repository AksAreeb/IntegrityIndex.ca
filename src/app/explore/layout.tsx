import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/explore` },
};

export default function ExploreLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
