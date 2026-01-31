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
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <Label.Root
        htmlFor="waitlist-email"
        className="sr-only"
      >
        Email for waitlist notification
      </Label.Root>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Notify me when the 44th Parliament Audit goes live."
          required
          disabled={status === "submitting"}
          aria-describedby="waitlist-status"
          className="flex-1 px-5 py-4 bg-white text-[#0f172a] placeholder:text-[#0f172a]/60 border border-white/20 rounded-sm text-base font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0f172a] disabled:opacity-70 transition-opacity"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="px-8 py-4 bg-white text-[#0f172a] font-semibold rounded-sm hover:bg-white/95 active:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0f172a] whitespace-nowrap"
        >
          {status === "submitting" ? "Submitting..." : "Join Waitlist"}
        </button>
      </div>
      <p id="waitlist-status" className="sr-only" aria-live="polite">
        {status === "success" && "Successfully joined the waitlist."}
        {status === "error" && "Something went wrong. Please try again."}
      </p>
      {status === "success" && (
        <p className="mt-3 text-sm text-white/80">
          Thank you. We will notify you when the 44th Parliament Audit goes live.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 text-sm text-red-300">
          Something went wrong. Please try again later.
        </p>
      )}
    </form>
  );
}
