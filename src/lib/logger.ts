/**
 * Production-safe logging. In development logs to console; in production only errors.
 */
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log("[IntegrityIndex]", ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn("[IntegrityIndex]", ...args);
    else if (typeof window === "undefined") console.warn("[IntegrityIndex]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[IntegrityIndex]", ...args);
  },
};
