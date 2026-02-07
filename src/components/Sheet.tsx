"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect } from "react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  /** Side of the screen. "right" = drawer from right (default). */
  side?: "right" | "left" | "bottom";
}

export function Sheet({ open, onOpenChange, children, side = "right" }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const sideClasses =
    side === "right"
      ? "inset-y-0 right-0 w-full max-w-[min(320px,85vw)] sm:max-w-sm"
      : side === "left"
        ? "inset-y-0 left-0 w-full max-w-[min(320px,85vw)] sm:max-w-sm"
        : "inset-x-0 bottom-0 h-[85vh] rounded-t-2xl";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0F172A]/50 transition-opacity duration-300" />
        <Dialog.Content
          className={`fixed z-50 flex flex-col bg-white shadow-xl duration-300 ease-out sheet-drawer sheet-drawer-${side} ${sideClasses} ${open ? "sheet-open" : ""}`}
          aria-describedby={undefined}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
