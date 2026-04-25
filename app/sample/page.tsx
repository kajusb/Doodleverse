"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { sampleScene } from "@/lib/sampleScene";

const Scene = dynamic(
  () => import("@/components/scene/Scene").then((m) => m.Scene),
  { ssr: false }
);

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Scene scene={sampleScene} />
      <button
        onClick={() => router.push("/upload")}
        className="absolute top-4 right-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-semibold transition text-sm z-10 shadow-lg"
      >
        ✏️ Upload a sketch
      </button>
    </>
  );
}