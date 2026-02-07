"use client";

export interface StatusPulseProps {
  /** Optional label shown next to the dot (e.g. "Live", "Syncing"). */
  label?: string;
  /** Accessible description for screen readers. */
  "aria-label"?: string;
  /** Extra class names for the wrapper. */
  className?: string;
}

/**
 * Small green dot with a subtle ping animation to indicate live/syncing data.
 */
export function StatusPulse({ label, "aria-label": ariaLabel, className = "" }: StatusPulseProps) {
  const defaultAria = label ? `Status: ${label}` : "Live data indicator";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`.trim()}
      role="status"
      aria-label={ariaLabel ?? defaultAria}
    >
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {label != null && label !== "" && (
        <span className="text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-600">
          {label}
        </span>
      )}
    </span>
  );
}
