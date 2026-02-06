"use client";

import {
  getMemberPhotoUrl,
  getFederalPhotoFallbackUrl,
  isFederal45PhotoUrl,
} from "@/lib/member-photos";

const PLACEHOLDER_AVATAR = "/avatars/placeholder.svg";

interface MemberPhotoProps {
  member: { id: string; jurisdiction: string; photoUrl?: string | null };
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export function MemberPhoto({
  member,
  width = 32,
  height = 32,
  className = "object-cover w-full h-full",
  alt = "",
}: MemberPhotoProps) {
  const src = getMemberPhotoUrl(member);
  const fallback44 =
    member.jurisdiction.toUpperCase() === "FEDERAL"
      ? getFederalPhotoFallbackUrl(member.id)
      : null;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        if (!el) return;
        if (fallback44 && isFederal45PhotoUrl(el.src)) {
          el.src = fallback44;
          return;
        }
        el.src = PLACEHOLDER_AVATAR;
      }}
    />
  );
}
