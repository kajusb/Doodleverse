"use no memo";
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { SceneJson } from "@/types/scene";

const Scene = dynamic(
  () => import("@/components/scene/Scene").then((m) => m.Scene),
  { ssr: false }
);

type LoadState =
  | { status: "loading" }
  | { status: "ready"; scene: SceneJson }
  | { status: "missing" };

export default function ViewPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const raw = sessionStorage.getItem("doodleverse:scene");
    if (!raw) {
      setState({ status: "missing" });
      return;
    }
    try {
      const scene = JSON.parse(raw) as SceneJson;
      setState({ status: "ready", scene });
    } catch {
      setState({ status: "missing" });
    }
  }, []);

  if (state.status === "loading") return null;

  if (state.status === "missing") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="text-xl mb-3">No generated scene found</div>
        <button
          onClick={() => router.push("/upload")}
          className="px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold"
        >
          Upload a sketch
        </button>
      </div>
    );
  }

  return (
    <>
      <Scene scene={state.scene} />
      <button
        onClick={() => router.push("/upload")}
        className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition text-sm z-10"
      >
        ← New sketch
      </button>
    </>
  );
}