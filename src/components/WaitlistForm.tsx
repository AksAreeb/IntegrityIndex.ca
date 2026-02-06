"use client";

import * as Label from "@radix-ui/react-label";
import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("submitting");
    try {
      // Placeholder for actual API integration
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <Label.Root
        htmlFor="waitlist-email"
        className="sr-only"
      >
        Email for waitlist notification
      </Label.Root>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Notify me when new disclosure data is available."
          required
          disabled={status === "submitting"}
          aria-describedby="waitlist-status"
          className="flex-1 h-[42px] px-5 bg-[#FFFFFF] text-[#0F172A] placeholder:text-[#0F172A]/60 border border-[#E2E8F0] rounded-sm text-base font-sans focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 disabled:opacity-70 transition-opacity"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="h-[42px] px-8 bg-[#0F172A] text-[#FFFFFF] font-sans font-semibold rounded-sm hover:bg-[#0F172A]/95 active:bg-[#0F172A]/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 whitespace-nowrap"
        >
          {status === "submitting" ? "Submitting..." : "Join Waitlist"}
        </button>
      </div>
      <p id="waitlist-status" className="sr-only" aria-live="polite">
        {status === "success" && "Successfully joined the waitlist."}
        {status === "error" && "Something went wrong. Please try again."}
      </p>
      {status === "success" && (
        <p className="mt-3 text-sm text-[#0F172A]/80 text-center font-sans">
          Thank you. We will notify you when new disclosure data is available.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-red-300 text-center font-sans">
          Something went wrong. Please try again later.
        </p>
      )}
    </form>
  );
}
