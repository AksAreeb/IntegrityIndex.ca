"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useJurisdiction } from "@/contexts/JurisdictionContext";
import { JurisdictionSwitcher } from "./JurisdictionSwitcher";
import { IntegrityTicker } from "./IntegrityTicker";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Representatives", href: "/mps" },
  { label: "Map", href: "/explore" },
  { label: "Legislation", href: "/bills" },
  { label: "Lab", href: "/lab" },
] as const;

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { jurisdiction, primaryColor } = useJurisdiction();
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen bg-[#FFFFFF]"
      data-jurisdiction={jurisdiction}
    >
      {/* Sticky Institutional Banner */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Left: Branding Lockup */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="IntegrityIndex Logo"
              width={40}
              height={40}
              className="w-10 h-10"
              priority
            />
            <span className="font-sans font-bold text-[#0F172A] text-base tracking-tight">
              IntegrityIndex
            </span>
          </Link>

          {/* Center: Navigation Links */}
          <nav
            className="flex-1 flex items-center justify-center gap-6"
            role="navigation"
            aria-label="Primary navigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative font-sans font-medium text-sm text-[#0F172A] hover:text-[var(--primary-accent)] transition-colors pb-1"
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ backgroundColor: primaryColor }}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Jurisdiction Switcher */}
          <div className="flex-shrink-0">
            <JurisdictionSwitcher />
          </div>
        </div>
      </header>

      {/* Integrity Ticker */}
      <IntegrityTicker />

      <main>{children}</main>
    </div>
  );
}
