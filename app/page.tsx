"use client";

import dynamic from "next/dynamic";
import { sampleScene } from "@/lib/sampleScene";

const Scene = dynamic(
  () => import("@/components/scene/Scene").then((m) => m.Scene),
  { ssr: false }
);

export default function Home() {
  return <Scene scene={sampleScene} />;
}