"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { MapSkeleton } from "./MapSkeleton";
import type { OversightMode } from "@/lib/riding-data";

const GovernanceMap = dynamic(
  () => import("./GovernanceMap").then((mod) => mod.GovernanceMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[280px] flex items-center justify-center">
        <MapSkeleton />
      </div>
    ),
  }
);

interface Props {
  mode: OversightMode;
}

const MAP_ASPECT_RATIO = "aspect-[16/10]";

function GovernanceMapDynamicInner({ mode }: Props) {
  return (
    <div className={`w-full ${MAP_ASPECT_RATIO} min-h-[400px] bg-[#F1F5F9] rounded-[4px] overflow-hidden`}>
      <div className="w-full h-full">
        <GovernanceMap mode={mode} />
      </div>
    </div>
  );
}

export const GovernanceMapDynamic = memo(GovernanceMapDynamicInner);
