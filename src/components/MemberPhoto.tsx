"use client";

import { useState } from "react";
import Image from "next/image";
import {
  getMemberPhotoUrl,
  getFederalPhotoFallbackUrl,
  isFederalMemberPhotosUrl,
} from "@/lib/member-photos";

const PLACEHOLDER_AVATAR = "/avatars/placeholder.svg";

interface MemberPhotoProps {
  member: {
    id: string;
    jurisdiction: string;
    photoUrl?: string | null;
    officialId?: string | null;
  };
  width?: number;
  height?: number;
  size?: number;
  className?: string;
  alt?: string;
}

export function MemberPhoto({
  member,
  width = 32,
  height = 32,
  size,
  className = "object-cover w-full h-full",
  alt = "",
}: MemberPhotoProps) {
  const [errorState, setErrorState] = useState<"none" | "tried44" | "placeholder">("none");
  const fallback44 =
    member.jurisdiction.toUpperCase() === "FEDERAL"
      ? getFederalPhotoFallbackUrl(member.officialId ?? member.id)
      : null;
  const primarySrc = getMemberPhotoUrl(member);

  const src =
    errorState === "placeholder"
      ? PLACEHOLDER_AVATAR
      : errorState === "tried44"
        ? fallback44 ?? PLACEHOLDER_AVATAR
        : primarySrc;

  const isKnownHost =
    src.startsWith("https://www.ourcommons.ca") ||
    src.startsWith("https://www.ola.org") ||
    src.startsWith("/");

  const handleError = () => {
    if (errorState === "none" && fallback44 && isFederalMemberPhotosUrl(primarySrc)) {
      setErrorState("tried44");
      return;
    }
    setErrorState("placeholder");
  };

  const w = size ?? width;
  const h = size ?? height;

  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={className}
      unoptimized={!isKnownHost || errorState !== "none"}
      onError={handleError}
    />
  );
}
