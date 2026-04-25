"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(
  () => import("@/components/scene/Scene").then((m) => m.Scene),
  { ssr: false }
);

export default function Home() {
  return <Scene />;
}