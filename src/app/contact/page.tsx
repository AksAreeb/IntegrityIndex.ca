import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Contact | Integrity Index",
  description: "Get in touch with the IntegrityIndex team.",
};

export default function ContactPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="font-serif text-2xl font-bold text-[#0F172A] mb-4">Contact</h1>
        <p className="text-[#64748B] font-sans mb-6">
          Get in touch with the IntegrityIndex team. Coming soon.
        </p>
        <Link href="/" className="text-sm font-medium text-[#0F172A] underline">
          ← Back to Home
        </Link>
      </div>
    </AppShell>
  );
}
