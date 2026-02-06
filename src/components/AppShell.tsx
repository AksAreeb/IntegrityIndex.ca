"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { useJurisdiction } from "@/contexts/JurisdictionContext";
import { JurisdictionSwitcher } from "./JurisdictionSwitcher";
import { GlobalSearch } from "@/components/GlobalSearch";

const StockTicker = dynamic(() => import("./StockTicker").then((mod) => mod.StockTicker), {
  ssr: false,
  loading: () => (
    <div
      className="bg-[#F8FAFC]/80 backdrop-blur-sm border-b border-[#E2E8F0]/50 min-h-[52px] flex items-center"
      role="status"
      aria-label="Loading ticker"
    >
      <span className="font-mono text-[11px] text-[#94A3B8] px-4">Loading…</span>
    </div>
  ),
});

const TRANSPARENCY_LINKS = [
  { label: "Members", href: "/members" },
  { label: "Representatives", href: "/mps" },
  { label: "The Pulse", href: "/pulse" },
] as const;

const MISSION_LINKS = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
] as const;

function NavLink({
  href,
  children,
  isActive,
  primaryColor,
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
  primaryColor: string;
}) {
  return (
    <Link
      href={href}
      className={`relative font-sans font-medium text-sm px-3 py-2 rounded-[6px] transition-colors ${
        isActive
          ? "text-[#0F172A]"
          : "text-[#0F172A]/90 hover:text-[#0F172A] hover:bg-white/50"
      }`}
      style={isActive ? { color: primaryColor } : undefined}
    >
      {children}
      {isActive && (
        <span
          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
          style={{ backgroundColor: primaryColor }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { jurisdiction, primaryColor } = useJurisdiction();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchExpanded) return;
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchExpanded]);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-[#FFFFFF]" data-jurisdiction={jurisdiction}>
      {/* Glassmorphism Header */}
      <header
        className="sticky top-0 z-50 border-b border-[#E2E8F0]/40"
        style={{
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="IntegrityIndex Logo"
              width={40}
              height={40}
              className="w-10 h-10"
              priority
            />
            <span className="font-sans font-bold text-[#0F172A] text-base tracking-tight hidden sm:inline">
              IntegrityIndex
            </span>
          </Link>

          {/* Center: Desktop Navigation (Shadcn-style NavigationMenu) */}
          <NavigationMenu.Root className="hidden md:flex flex-1 justify-center relative">
            <NavigationMenu.List className="flex items-center gap-1 list-none m-0 p-0">
              {/* Pillar 1: Transparency */}
              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="group flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#0F172A]/90 hover:text-[#0F172A] hover:bg-white/50 rounded-[6px] outline-none focus:ring-2 focus:ring-[#0F172A]/20 data-[state=open]:bg-white/50">
                  Transparency
                  <svg
                    className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute top-0 left-1/2 -translate-x-1/2 w-[220px] rounded-lg bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg p-1">
                  {TRANSPARENCY_LINKS.map((item) => (
                    <NavigationMenu.Link asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="block px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] rounded-[4px]"
                      >
                        {item.label}
                      </Link>
                    </NavigationMenu.Link>
                  ))}
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              {/* Pillar 2: My Riding */}
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Link href="/my-riding">
                    <NavLink
                      href="/my-riding"
                      isActive={isActive("/my-riding")}
                      primaryColor={primaryColor}
                    >
                      My Riding
                    </NavLink>
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>

              {/* Pillar 3: Legislation */}
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Link href="/legislation">
                    <NavLink
                      href="/legislation"
                      isActive={isActive("/legislation")}
                      primaryColor={primaryColor}
                    >
                      Legislation
                    </NavLink>
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>

              {/* Pillar 4: Mission */}
              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="group flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#0F172A]/90 hover:text-[#0F172A] hover:bg-white/50 rounded-[6px] outline-none focus:ring-2 focus:ring-[#0F172A]/20 data-[state=open]:bg-white/50">
                  Mission
                  <svg
                    className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] rounded-lg bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-lg p-1">
                  {MISSION_LINKS.map((item) => (
                    <NavigationMenu.Link asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="block px-4 py-2.5 text-sm text-[#0F172A] hover:bg-[#F8FAFC] rounded-[4px]"
                      >
                        {item.label}
                      </Link>
                    </NavigationMenu.Link>
                  ))}
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            </NavigationMenu.List>
            <NavigationMenu.Viewport className="absolute top-full left-0 w-full flex justify-center pt-2" />
          </NavigationMenu.Root>

          {/* Right: Search (compact icon until clicked) + Jurisdiction Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div
              ref={searchRef}
              className={`transition-[width] duration-200 ease-out overflow-hidden flex items-center ${
                searchExpanded ? "w-[200px] sm:w-[260px]" : "w-9"
              }`}
            >
              {searchExpanded ? (
                <GlobalSearch />
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchExpanded(true)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#E2E8F0]/80 bg-white/60 hover:bg-white/90 text-[#64748B] hover:text-[#0F172A] transition-colors shrink-0"
                  aria-label="Open search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="hidden sm:flex shrink-0">
              <JurisdictionSwitcher />
            </div>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-[#E2E8F0] bg-white/60 hover:bg-white/80 text-[#0F172A]"
              aria-expanded={mobileOpen}
              aria-label="Open menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div
            className="md:hidden border-t border-[#E2E8F0]/40 bg-white/95 backdrop-blur-md"
            style={{ background: "rgba(255, 255, 255, 0.95)" }}
          >
            <nav className="px-4 py-4 space-y-1" role="navigation" aria-label="Mobile navigation">
              {/* My Riding — prominent on mobile */}
              <Link
                href="/my-riding"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3 px-4 rounded-lg bg-[#0F172A] text-white font-sans font-semibold text-sm"
              >
                My Riding — Audit Your Representatives
              </Link>

              <div className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] px-2">
                Transparency
              </div>
              {TRANSPARENCY_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 px-4 rounded-lg text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  {item.label}
                </Link>
              ))}

              <div className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] px-2">
                Legislation
              </div>
              <Link
                href="/legislation"
                onClick={() => setMobileOpen(false)}
                className="block py-2.5 px-4 rounded-lg text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Legislation
              </Link>

              <div className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] px-2">
                Mission
              </div>
              {MISSION_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2.5 px-4 rounded-lg text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
                >
                  {item.label}
                </Link>
              ))}

              <div className="pt-4 border-t border-[#E2E8F0] mt-2">
                <JurisdictionSwitcher />
              </div>
            </nav>
          </div>
        )}
      </header>

      <StockTicker />
      <main>{children}</main>
    </div>
  );
}
