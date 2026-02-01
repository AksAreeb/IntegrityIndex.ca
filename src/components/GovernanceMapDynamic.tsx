"use client";

import dynamic from "next/dynamic";
import { MapSkeleton } from "./MapSkeleton";
import type { OversightMode } from "@/lib/riding-data";

const GovernanceMap = dynamic(
  () => import("./GovernanceMap").then((mod) => mod.GovernanceMap),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  }
);

interface Props {
  mode: OversightMode;
}

export function GovernanceMapDynamic({ mode }: Props) {
  return <GovernanceMap mode={mode} />;
}
