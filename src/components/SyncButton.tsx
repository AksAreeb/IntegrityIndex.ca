"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [status, setStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const router = useRouter();

  const handleSync = async () => {
    setStatus("syncing");
    try {
      const res = await fetch("/api/sync");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
      router.refresh();
    } catch (err) {
      console.error("[SyncButton]: Sync failed", err);
      setStatus("error");
    }
  };

  const label =
    status === "syncing"
      ? "Syncing..."
      : status === "success"
        ? "Synced"
        : status === "error"
          ? "Sync failed"
          : "Sync roster now";

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={status === "syncing"}
      className="font-medium underline hover:no-underline disabled:opacity-70 disabled:cursor-wait"
    >
      {label}
    </button>
  );
}
