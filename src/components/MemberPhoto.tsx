"use client";

import { useState } from "react";
import Image from "next/image";
import {
  getMemberPhotoUrl,
  getFederalPhotoFallbackUrl,
  isFederalMemberPhotosUrl,
} from "@/lib/member-photos";

/** Fallback image when MP photo fails to load (parliamentary silhouette). */
const PARLIAMENTARY_SILHOUETTE = "/avatars/placeholder.svg";

interface MemberPhotoProps {
  member: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    jurisdiction: string;
    photoUrl?: string | null;
    officialId?: string | null;
  };
  width?: number;
  height?: number;
  size?: number;
  className?: string;
  /** Alt text for the image; defaults to the member's name for accessibility. */
  alt?: string;
  /** Set true for above-the-fold photos (e.g. individual member page) for LCP. */
  priority?: boolean;
}

export function MemberPhoto({
  member,
  width = 32,
  height = 32,
  size,
  className = "object-cover w-full h-full",
  alt,
  priority = false,
}: MemberPhotoProps) {
  const [errorState, setErrorState] = useState<"none" | "tried44" | "placeholder">("none");
  const fallback44 =
    member.jurisdiction.toUpperCase() === "FEDERAL"
      ? getFederalPhotoFallbackUrl(member.officialId ?? member.id)
      : null;
  const primarySrc = getMemberPhotoUrl(member);

  const src =
    errorState === "placeholder"
      ? PARLIAMENTARY_SILHOUETTE
      : errorState === "tried44"
        ? fallback44 ?? PARLIAMENTARY_SILHOUETTE
        : primarySrc;

  const fullName =
    (member.firstName != null && member.lastName != null
      ? `${member.firstName} ${member.lastName}`.trim()
      : null) ?? member.name ?? "";
  const altText = alt ?? fullName || "Member photo";

  const isKnownHost =
    src.startsWith("https://www.ourcommons.ca") ||
    src.startsWith("https://www.ola.org") ||
    src.startsWith("/");

  const onError = () => {
    if (errorState === "none" && fallback44 && isFederalMemberPhotosUrl(primarySrc)) {
      setErrorState("tried44");
      return;
    }
    setErrorState("placeholder");
  };

  const w = size ?? width;
  const h = size ?? height;

  return (
    <div className="group overflow-hidden shadow-md transition-shadow duration-300 group-hover:shadow-xl">
      <Image
        src={src}
        alt={altText}
        width={w}
        height={h}
        className={`${className} transition-transform duration-300 group-hover:scale-105`}
        priority={priority}
        unoptimized={!isKnownHost || errorState !== "none"}
        onError={onError}
      />
    </div>
  );
}
